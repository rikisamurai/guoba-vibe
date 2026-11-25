import { describe, expect, it } from 'vitest'

import { VirtualClock } from '../engine/clock'
import { ReplaySource, TimedReplay } from './replay-source'

describe('TimedReplay', () => {
  it('replays records at deterministic offsets on the injected clock', async () => {
    const clock = new VirtualClock()
    const replay = new TimedReplay(clock, [
      { at: 10, value: 'first' },
      { at: 25, value: 'second' },
    ])
    const iterator = replay.open(new AbortController().signal)

    const first = iterator.next()
    await Promise.resolve()
    clock.advanceBy(10)
    await expect(first).resolves.toEqual({ done: false, value: 'first' })
    expect(clock.now()).toBe(10)

    const second = iterator.next()
    clock.advanceBy(15)
    await expect(second).resolves.toEqual({ done: false, value: 'second' })
    expect(clock.now()).toBe(25)

    await expect(iterator.next()).resolves.toEqual({ done: true, value: undefined })
  })

  it('stops a pending replay when aborted without leaking clock work', async () => {
    const clock = new VirtualClock()
    const replay = new TimedReplay(clock, [{ at: 100, value: 'late' }])
    const controller = new AbortController()
    const consuming = collect(replay.open(controller.signal))

    await Promise.resolve()
    controller.abort()

    await expect(consuming).resolves.toEqual([])
    expect(clock.pendingCount).toBe(0)
  })
})

describe('ReplaySource', () => {
  it('wraps lifecycle records with stable replay source metadata', async () => {
    const clock = new VirtualClock()
    const source = new ReplaySource(clock, [
      { at: 0, event: { type: 'response.start', responseId: 'fixture-1' } },
      {
        at: 0,
        event: {
          type: 'response.end',
          outcome: { kind: 'completed', reason: 'fixture' },
        },
      },
    ])
    const consuming = collect(source.open(new AbortController().signal))

    await Promise.resolve()
    clock.runUntilIdle()
    await Promise.resolve()
    clock.runUntilIdle()

    await expect(consuming).resolves.toMatchObject([
      {
        sourceEventOrdinal: 0,
        splitIndex: 0,
        origin: { protocol: 'replay', recordIndex: 0 },
      },
      {
        sourceEventOrdinal: 1,
        splitIndex: 0,
        origin: { protocol: 'replay', recordIndex: 1 },
      },
    ])
  })
})

async function collect<T>(items: AsyncIterable<T>): Promise<T[]> {
  const values: T[] = []
  for await (const item of items) values.push(item)
  return values
}
