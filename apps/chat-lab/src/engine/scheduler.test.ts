import { afterEach, beforeEach, expect, test, vi } from 'vitest'

import type { CommitFrame } from './scheduler'
import { createScheduler } from './scheduler'

beforeEach(() => {
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
})

function collect(): { frames: CommitFrame[]; emit: (frame: CommitFrame) => void } {
  const frames: CommitFrame[] = []
  return { frames, emit: (frame) => frames.push(frame) }
}

test('immediate policy commits once per delta', () => {
  const { frames, emit } = collect()
  const scheduler = createScheduler({ policy: 'immediate', now: () => 0 }, emit)
  scheduler.onDelta('a')
  scheduler.onDelta('b')
  scheduler.onDelta('c')
  expect(frames.map((frame) => frame.text)).toEqual(['a', 'ab', 'abc'])
  expect(frames.map((frame) => frame.commitIndex)).toEqual([1, 2, 3])
  expect(frames.every((frame) => frame.phase === 'streaming')).toBe(true)
})

test('throttled policy merges deltas inside the window', () => {
  let clock = 0
  const { frames, emit } = collect()
  const scheduler = createScheduler({ policy: 'throttled', throttleMs: 48, now: () => clock }, emit)
  scheduler.onDelta('a') // first delta: window is open (lastCommit = -inf) → commits
  clock = 10
  scheduler.onDelta('b') // inside window → deferred
  clock = 20
  scheduler.onDelta('c') // still deferred, same timer
  expect(frames.map((frame) => frame.text)).toEqual(['a'])
  clock = 48
  vi.advanceTimersByTime(48)
  expect(frames.map((frame) => frame.text)).toEqual(['a', 'abc'])
})

test('done flushes pending text and commits final', () => {
  let clock = 0
  const { frames, emit } = collect()
  const scheduler = createScheduler({ policy: 'throttled', throttleMs: 48, now: () => clock }, emit)
  scheduler.onDelta('a')
  clock = 10
  scheduler.onDelta('b')
  scheduler.onDone()
  expect(frames.at(-1)).toMatchObject({ text: 'ab', phase: 'final' })
  // pending timer must not fire another commit afterwards
  vi.advanceTimersByTime(100)
  expect(frames.filter((frame) => frame.phase === 'final')).toHaveLength(1)
})

test('abort snapshots full raw text as cancelled', () => {
  let clock = 0
  const { frames, emit } = collect()
  const scheduler = createScheduler({ policy: 'throttled', throttleMs: 48, now: () => clock }, emit)
  scheduler.onDelta('hello ')
  clock = 5
  scheduler.onDelta('world')
  scheduler.onAbort()
  expect(frames.at(-1)).toMatchObject({ text: 'hello world', phase: 'cancelled' })
})

test('error commits an error frame with the message', () => {
  const { frames, emit } = collect()
  const scheduler = createScheduler({ policy: 'immediate', now: () => 0 }, emit)
  scheduler.onDelta('partial')
  scheduler.onError('boom')
  expect(frames.at(-1)).toMatchObject({ text: 'partial', phase: 'error', error: 'boom' })
})

test('events after a terminal state are ignored', () => {
  const { frames, emit } = collect()
  const scheduler = createScheduler({ policy: 'immediate', now: () => 0 }, emit)
  scheduler.onDelta('a')
  scheduler.onDone()
  scheduler.onDelta('b')
  scheduler.onAbort()
  expect(frames.at(-1)).toMatchObject({ text: 'a', phase: 'final' })
})
