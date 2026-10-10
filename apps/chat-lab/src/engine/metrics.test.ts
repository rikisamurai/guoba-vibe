import { expect, test } from 'vitest'

import { createMetrics } from './metrics'

function clock(start = 0): { now: () => number; tick: (ms: number) => void } {
  let time = start
  return { now: () => time, tick: (ms) => (time += ms) }
}

test('commitsPerSec counts only the 2s sliding window', () => {
  const { now, tick } = clock()
  const metrics = createMetrics(now)
  metrics.reset('t')
  for (let index = 0; index < 10; index++) {
    metrics.onCommit(index)
    tick(100)
  }
  // 10 commits in the last second → 5 per second over the 2s window
  expect(metrics.snapshot().commitsPerSec).toBe(5)
  tick(3000)
  expect(metrics.snapshot().commitsPerSec).toBe(0)
  expect(metrics.snapshot().commitCount).toBe(10)
})

test('rawToVisible pairs each delta with the first commit covering it', () => {
  const { now, tick } = clock()
  const metrics = createMetrics(now)
  metrics.reset('t')
  metrics.onDelta(10) // ends at offset 10, at t=0
  tick(64)
  metrics.onCommit(10) // covers it at t=64
  metrics.onDelta(5) // ends at 15, t=64
  tick(36)
  metrics.onCommit(12) // does NOT cover offset 15
  tick(100)
  metrics.onCommit(15) // covers at t=200
  const snapshot = metrics.snapshot()
  expect(snapshot.rawToVisibleMs).not.toBeNull()
  expect(snapshot.rawToVisibleMs?.p50).toBe(64)
  expect(snapshot.rawToVisibleMs?.p95).toBe(136)
})

test('render and tail parse report last and p95', () => {
  const metrics = createMetrics(() => 0)
  metrics.reset('t')
  for (const value of [1, 2, 3, 4, 100]) metrics.onRender(value)
  metrics.onSplit(0.5, 3, 4)
  metrics.onSplit(1.5, 4, 5)
  const snapshot = metrics.snapshot()
  expect(snapshot.renderMs).toEqual({ last: 100, p95: 100 })
  expect(snapshot.tailParseMs?.last).toBe(1.5)
  expect(snapshot.blockCount).toBe(5)
  expect(snapshot.stableRatio).toBe(0.8)
})

test('reset clears everything and empty snapshot uses nulls', () => {
  const metrics = createMetrics(() => 0)
  metrics.reset('a')
  metrics.onDelta(3)
  metrics.onCommit(3)
  metrics.onRender(1)
  metrics.reset('b')
  const snapshot = metrics.snapshot()
  expect(snapshot).toMatchObject({
    runLabel: 'b',
    commitCount: 0,
    rawToVisibleMs: null,
    renderMs: null,
    tailParseMs: null,
    blockCount: null,
    stableRatio: null,
  })
})
