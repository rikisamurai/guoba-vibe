import { describe, expect, it } from 'vitest'

import { compareBatch, compareDelivery, decodeSplit, INTRO_PARTS } from './models'

describe('新手实验的可验证结论', () => {
  it('完整响应只在终点出现，流式先显示部分内容', () => {
    expect(compareDelivery(1)).toMatchObject({ complete: '', received: '流式', firstStream: 400 })
    const end = compareDelivery(INTRO_PARTS.length)
    expect(end.complete).toBe(end.received)
    expect(end.firstComplete).toBe(2400)
  })
  it('所有字节切分位置都保留中文与 emoji', () => {
    for (let split = 1; split < 10; split++)
      expect(decodeSplit('你好🌊', split).correct).toBe('你好🌊')
    expect(decodeSplit('你好🌊', 1).wrong).not.toBe('你好🌊')
  })
  it('合并时保留不足一批的尾部，空输入不产生更新', () => {
    const result = compareBatch(['a', 'b', 'c', 'd', '尾'], 4)
    expect(result.snapshots).toEqual(['abcd', 'abcd尾'])
    expect(result.firstVisible).toBe(80)
    expect(compareBatch([], 4).snapshots).toEqual([])
  })
})
