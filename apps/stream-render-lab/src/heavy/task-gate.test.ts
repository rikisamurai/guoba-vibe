import { describe, expect, it, vi } from 'vitest'

import { VirtualClock } from '../engine/clock'
import { createHeavyTaskGate, type HeavyTask } from './task-gate'

function deferred<T>(): {
  promise: Promise<T>
  resolve: (value: T) => void
} {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((done) => {
    resolve = done
  })
  return { promise, resolve }
}

const task = (revision: number, source: string): HeavyTask => ({
  runId: 'run-1',
  blockId: 'diagram-1',
  revision,
  source,
})

describe('HeavyTaskGate', () => {
  it('never commits a stale async result', async () => {
    const clock = new VirtualClock()
    const first = deferred<string>()
    const second = deferred<string>()
    const commit = vi.fn()
    const gate = createHeavyTaskGate({
      clock,
      delayMs: 250,
      render: (input) => (input.revision === 1 ? first.promise : second.promise),
      onCommit: commit,
    })

    gate.push(task(1, 'old'))
    clock.advanceBy(250)
    gate.push(task(2, 'new'))
    first.resolve('old svg')
    await Promise.resolve()
    await Promise.resolve()
    expect(commit).not.toHaveBeenCalled()

    clock.advanceBy(250)
    second.resolve('new svg')
    await gate.flush()
    expect(commit).toHaveBeenCalledOnce()
    expect(commit).toHaveBeenCalledWith(task(2, 'new'), 'new svg')
  })

  it('flush forces the latest task and can be awaited', async () => {
    const clock = new VirtualClock()
    const commit = vi.fn()
    const gate = createHeavyTaskGate({
      clock,
      delayMs: 250,
      render: async ({ source }) => `<svg>${source}</svg>`,
      onCommit: commit,
    })
    gate.push(task(3, 'final'))
    await gate.flush()
    expect(clock.pendingCount).toBe(0)
    expect(commit).toHaveBeenCalledWith(task(3, 'final'), '<svg>final</svg>')
  })

  it('dispose aborts work and suppresses late commits', async () => {
    const clock = new VirtualClock()
    const work = deferred<string>()
    const commit = vi.fn()
    const gate = createHeavyTaskGate({
      clock,
      delayMs: 0,
      render: () => work.promise,
      onCommit: commit,
    })
    gate.push(task(1, 'source'))
    clock.runUntilIdle()
    gate.dispose()
    work.resolve('late')
    await Promise.resolve()
    await Promise.resolve()
    expect(commit).not.toHaveBeenCalled()
  })

  it('reports a permanent error once without retrying forever during flush', async () => {
    const clock = new VirtualClock()
    const onError = vi.fn()
    const render = vi.fn(async () => {
      throw new Error('invalid diagram')
    })
    const gate = createHeavyTaskGate({
      clock,
      delayMs: 100,
      render,
      onCommit: vi.fn(),
      onError,
    })
    gate.push(task(4, 'broken'))
    await gate.flush()
    await gate.flush()
    expect(render).toHaveBeenCalledOnce()
    expect(onError).toHaveBeenCalledOnce()
  })

  it('uses the injected clock to fail hung work at its deadline', async () => {
    const clock = new VirtualClock()
    const onError = vi.fn()
    const gate = createHeavyTaskGate({
      clock,
      delayMs: 0,
      timeoutMs: 500,
      render: () => new Promise<string>(() => {}),
      onCommit: vi.fn(),
      onError,
    })
    gate.push(task(5, 'hung'))
    const flushed = gate.flush()
    await Promise.resolve()
    clock.advanceBy(499)
    expect(onError).not.toHaveBeenCalled()
    clock.advanceBy(1)
    await flushed

    expect(onError).toHaveBeenCalledOnce()
    expect(onError.mock.calls[0]?.[1]).toMatchObject({ name: 'HeavyTaskTimeoutError' })
    expect(clock.pendingCount).toBe(0)
  })
})
