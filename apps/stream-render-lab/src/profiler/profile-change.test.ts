import { describe, expect, it } from 'vitest'

import { describeProfileOutcome, formatLowerIsBetterChange } from './profile-change'

describe('formatLowerIsBetterChange', () => {
  it('labels a lower challenger value as an improvement', () => {
    expect(formatLowerIsBetterChange(100, 80)).toEqual({
      compact: '−20%',
      direction: 'improvement',
      sentence: '改善 20%',
    })
  })

  it('labels a higher challenger value as a regression without double signs', () => {
    expect(formatLowerIsBetterChange(80, 100)).toEqual({
      compact: '+25%',
      direction: 'regression',
      sentence: '回归 25%',
    })
  })

  it('reports an exact tie as no change', () => {
    expect(formatLowerIsBetterChange(100, 100)).toEqual({
      compact: '0%',
      direction: 'unchanged',
      sentence: '无变化',
    })
  })

  it('does not invent a percentage when a zero baseline increases', () => {
    expect(formatLowerIsBetterChange(0, 4)).toEqual({
      compact: 'N/A',
      direction: 'regression',
      sentence: '回归（基线为 0，无法计算百分比）',
    })
  })
})

describe('describeProfileOutcome', () => {
  it('changes the headline with the measured directions', () => {
    expect(describeProfileOutcome(['improvement', 'improvement'])).toContain('减少')
    expect(describeProfileOutcome(['improvement', 'regression'])).toContain('取舍')
    expect(describeProfileOutcome(['regression', 'regression'])).toContain('回归')
    expect(describeProfileOutcome(['unchanged', 'unchanged'])).toContain('没有变化')
  })
})
