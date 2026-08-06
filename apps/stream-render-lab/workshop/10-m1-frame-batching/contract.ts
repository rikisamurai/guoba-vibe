import { expect } from 'vitest'

import { VirtualClock } from '../../src/engine/clock'
import { MINI_CHAT_WIRE } from '../05-sse/fixtures/mini-chat'
import { parseLessonSse } from '../05-sse/solution/parse-sse'
import { runMiniChat } from '../shared/mini-chat'

export interface FrameBatcher {
  push(delta: string): void
  drain(): void
  cancel(): void
}

export type FrameBatcherImplementation = (
  clock: VirtualClock,
  commit: (text: string) => void,
) => FrameBatcher

export function assertFrameBatcherContract(create: FrameBatcherImplementation): void {
  const clock = new VirtualClock()
  const commits: string[] = []
  const batcher = create(clock, (text) => commits.push(text))

  batcher.push('A')
  batcher.push('B')
  batcher.push('C')
  expect(commits).toEqual([])
  expect(clock.pendingCount).toBe(1)
  clock.advanceFrame()
  expect(commits).toEqual(['ABC'])

  batcher.push('D')
  batcher.drain()
  expect(commits).toEqual(['ABC', 'D'])
  clock.runUntilIdle()
  expect(commits).toEqual(['ABC', 'D'])
  expect(clock.pendingCount).toBe(0)

  const cancelClock = new VirtualClock()
  const cancelledCommits: string[] = []
  const cancelled = create(cancelClock, (text) => cancelledCommits.push(text))
  cancelled.push('late ')
  cancelled.push('update')
  expect(cancelClock.pendingCount).toBe(1)
  cancelled.cancel()
  expect(cancelClock.pendingCount).toBe(0)
  cancelClock.advanceFrame()
  expect(cancelledCommits).toEqual([])
}

export async function assertMiniChatEvolution(create: FrameBatcherImplementation): Promise<void> {
  const result = await runMiniChat(MINI_CHAT_WIRE, parseLessonSse, create)
  expect(result.raw).toBe('同一个 mini chat 继续演进。')
  expect(result.visible).toBe(result.raw)
  expect(result.terminal).toBe(true)
  expect(result.commits).toBeLessThan(result.deltas)
  expect(result.pendingTasks).toBe(0)
}
