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

test('smoothing reveals gradually and drains after done', () => {
  let clock = 0
  const { frames, emit } = collect()
  const scheduler = createScheduler(
    { policy: 'throttled', throttleMs: 50, smoothing: true, revealCps: 200, now: () => clock },
    emit,
  )
  // 100 chars arrive at once; at 200 cps and 50ms ticks → ~10 chars per tick
  scheduler.onDelta('x'.repeat(100))
  expect(frames).toHaveLength(1)
  expect(frames[0].phase).toBe('streaming')
  expect(frames[0].text.length).toBeLessThan(100)

  scheduler.onDone()
  const drainingSeen: string[] = []
  for (let step = 0; step < 30 && frames.at(-1)?.phase !== 'final'; step++) {
    clock += 50
    vi.advanceTimersByTime(50)
    const phase = frames.at(-1)?.phase
    if (phase === 'draining') drainingSeen.push(phase)
  }
  expect(drainingSeen.length).toBeGreaterThan(0)
  expect(frames.at(-1)).toMatchObject({ phase: 'final', text: 'x'.repeat(100) })
  // visible text only ever grows
  for (let index = 1; index < frames.length; index++) {
    expect(frames[index].text.startsWith(frames[index - 1].text)).toBe(true)
  }
})

test('smoothing cursor never splits a grapheme cluster', () => {
  let clock = 0
  const { frames, emit } = collect()
  const scheduler = createScheduler(
    { policy: 'throttled', throttleMs: 50, smoothing: true, revealCps: 100, now: () => clock },
    emit,
  )
  scheduler.onDelta('ab👨‍👩‍👧‍👦cd👨‍👩‍👧‍👦ef'.repeat(3))
  scheduler.onDone()
  for (let step = 0; step < 40 && frames.at(-1)?.phase !== 'final'; step++) {
    clock += 50
    vi.advanceTimersByTime(50)
  }
  expect(frames.at(-1)?.phase).toBe('final')
  for (const frame of frames) {
    expect(frame.text.includes('‍�')).toBe(false)
    // a frame must never end in the middle of a ZWJ sequence
    expect(frame.text.endsWith('‍')).toBe(false)
  }
})

test('abort during draining resolves to final since all text arrived', () => {
  let clock = 0
  const { frames, emit } = collect()
  const scheduler = createScheduler(
    { policy: 'throttled', throttleMs: 50, smoothing: true, revealCps: 100, now: () => clock },
    emit,
  )
  scheduler.onDelta('y'.repeat(200))
  scheduler.onDone()
  clock += 50
  vi.advanceTimersByTime(50)
  scheduler.onAbort()
  expect(frames.at(-1)).toMatchObject({ phase: 'final', text: 'y'.repeat(200) })
})
