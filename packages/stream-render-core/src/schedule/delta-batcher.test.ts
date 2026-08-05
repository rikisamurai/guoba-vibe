import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { createDeltaBatcher } from './delta-batcher'

describe('createDeltaBatcher', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('窗口内的多个增量合并为一次提交', () => {
    const flushes: string[][] = []
    const batcher = createDeltaBatcher<string>((b) => flushes.push(b), 48)
    batcher.push('a')
    batcher.push('b')
    batcher.push('c')
    expect(flushes).toEqual([])
    vi.advanceTimersByTime(48)
    expect(flushes).toEqual([['a', 'b', 'c']])
  })

  it('flush 立即提交并取消定时器', () => {
    const flushes: string[][] = []
    const batcher = createDeltaBatcher<string>((b) => flushes.push(b), 48)
    batcher.push('a')
    batcher.flush()
    expect(flushes).toEqual([['a']])
    vi.advanceTimersByTime(100)
    expect(flushes).toEqual([['a']])
  })

  it('空队列 flush 不触发提交', () => {
    const flushes: string[][] = []
    const batcher = createDeltaBatcher<string>((b) => flushes.push(b))
    batcher.flush()
    expect(flushes).toEqual([])
  })
})
