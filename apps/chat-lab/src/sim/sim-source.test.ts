import { afterEach, beforeEach, expect, test, vi } from 'vitest'

import type { StreamEvent } from '../types/stream'
import { planChunks } from './profiles'
import { createSimSource } from './sim-source'

beforeEach(() => {
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
})

async function drain(events: AsyncIterable<StreamEvent>): Promise<StreamEvent[]> {
  const collected: StreamEvent[] = []
  const done = (async () => {
    for await (const event of events) collected.push(event)
  })()
  await vi.runAllTimersAsync()
  await done
  return collected
}

test('replays the full text in order and ends with done', async () => {
  const text = 'Hello **streaming** world with 中文 and 👨‍👩‍👧‍👦'
  const source = createSimSource(planChunks(text, 'boundary', 5))
  const events = await drain(source.events)
  const deltas = events.filter((event) => event.type === 'delta')
  expect(deltas.map((event) => event.text).join('')).toBe(text)
  expect(events.at(-1)).toEqual({ type: 'done', finishReason: 'stop' })
  // mid-codepoint cuts never surface replacement characters
  expect(deltas.some((event) => event.text.includes('�'))).toBe(false)
})

test('abort stops the stream without emitting done', async () => {
  const text = 'a'.repeat(400)
  const source = createSimSource(planChunks(text, 'ideal', 1))
  const collected: StreamEvent[] = []
  const consumer = (async () => {
    for await (const event of source.events) {
      collected.push(event)
      if (collected.length === 3) source.abort()
    }
  })()
  await vi.runAllTimersAsync()
  await consumer
  expect(collected.length).toBeLessThanOrEqual(4)
  expect(collected.every((event) => event.type === 'delta')).toBe(true)
})

test('speed multiplier shortens waits', async () => {
  const text = 'abcdefghij'.repeat(20)
  const plan = planChunks(text, 'ideal', 2)
  const source = createSimSource(plan, 2)
  const started = Date.now()
  const events = await drain(source.events)
  const elapsed = Date.now() - started
  const fullDelay = plan.reduce((sum, chunk) => sum + chunk.delayMs, 0)
  expect(events.at(-1)?.type).toBe('done')
  expect(elapsed).toBeLessThanOrEqual(fullDelay / 2 + 5)
})
