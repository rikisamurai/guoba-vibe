import { expect, it } from 'vitest'

import { defineStep06Contract, type Step06Api } from '../06-chat-completions/contract'
import { M1_BURST, M1_FRAME_MS } from './fixture'

type Cancel = () => void

export interface FrameClock {
  frame(task: (timestamp: number) => void): Cancel
}

export interface VirtualFrameClock extends FrameClock {
  readonly pendingCount: number
  advanceFrame(): void
}

export interface FrameBatcher {
  push(delta: string): void
  drain(): void
  cancel(): void
}

export type FrameBatcherFactory = (
  clock: FrameClock,
  commit: (batch: string) => void,
) => FrameBatcher

export interface Step10Api extends Step06Api {
  createFrameBatcher: FrameBatcherFactory
}

export function defineStep10Contract(api: Step10Api): void {
  defineStep06Contract(api)

  it('10 commits once per frame, drains the tail, and cancels late work', () => {
    const clock = createVirtualFrameClock()
    const commits: string[] = []
    const batcher = api.createFrameBatcher(clock, (batch) => commits.push(batch))
    let raw = ''

    for (const delta of M1_BURST) {
      raw += delta
      batcher.push(delta)
    }

    expect(raw).toBe('你好，🙂！')
    expect(commits).toEqual([])
    expect(clock.pendingCount).toBe(1)

    clock.advanceFrame()
    expect(commits).toEqual([raw])
    expect(clock.pendingCount).toBe(0)

    raw += '收尾'
    batcher.push('收尾')
    batcher.drain()
    expect(commits.join('')).toBe(raw)
    clock.advanceFrame()
    expect(commits).toHaveLength(2)

    const cancelledClock = createVirtualFrameClock()
    const cancelledCommits: string[] = []
    const cancelled = api.createFrameBatcher(cancelledClock, (batch) =>
      cancelledCommits.push(batch),
    )
    cancelled.push('late update')
    cancelled.cancel()
    cancelledClock.advanceFrame()
    expect(cancelledCommits).toEqual([])
    expect(cancelledClock.pendingCount).toBe(0)
  })
}

function createVirtualFrameClock(): VirtualFrameClock {
  let now = 0
  let nextId = 0
  const tasks = new Map<number, (timestamp: number) => void>()

  return {
    get pendingCount() {
      return tasks.size
    },
    frame(task) {
      const id = nextId++
      tasks.set(id, task)
      return () => tasks.delete(id)
    },
    advanceFrame() {
      now += M1_FRAME_MS
      const currentFrame = [...tasks.values()]
      tasks.clear()
      for (const task of currentFrame) task(now)
    },
  }
}
