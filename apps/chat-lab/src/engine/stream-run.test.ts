import { expect, test } from 'vitest'

import type { StreamEvent, TokenSource } from '../types/stream'
import type { CommitFrame } from './scheduler'
import { createScheduler } from './scheduler'
import { runStream } from './stream-run'

function sourceOf(events: StreamEvent[], abortAfter?: number): TokenSource {
  let aborted = false
  async function* generate(): AsyncGenerator<StreamEvent> {
    let index = 0
    for (const event of events) {
      if (aborted) return
      yield event
      index += 1
      if (abortAfter !== undefined && index >= abortAfter) aborted = true
    }
  }
  return {
    events: generate(),
    abort() {
      aborted = true
    },
  }
}

function run(events: StreamEvent[], abortAfter?: number) {
  const frames: CommitFrame[] = []
  const scheduler = createScheduler({ policy: 'immediate', now: () => 0 }, (frame) =>
    frames.push(frame),
  )
  return runStream(sourceOf(events, abortAfter), scheduler).then(() => frames)
}

test('routes deltas and done into the scheduler', async () => {
  const frames = await run([
    { type: 'delta', text: 'Hi ' },
    { type: 'delta', text: 'there' },
    { type: 'done', finishReason: 'stop' },
  ])
  expect(frames.at(-1)).toMatchObject({ text: 'Hi there', phase: 'final' })
})

test('iterator ending without done becomes cancelled', async () => {
  const frames = await run(
    [
      { type: 'delta', text: 'partial ' },
      { type: 'delta', text: 'reply' },
    ],
    2,
  )
  expect(frames.at(-1)).toMatchObject({ text: 'partial reply', phase: 'cancelled' })
})

test('error events become error frames', async () => {
  const frames = await run([
    { type: 'delta', text: 'x' },
    { type: 'error', message: 'upstream 429' },
  ])
  expect(frames.at(-1)).toMatchObject({ phase: 'error', error: 'upstream 429' })
})
