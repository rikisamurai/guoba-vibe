import { describe, expect, it } from 'vitest'

import { variability } from './profile-statistics'

describe('profile statistics', () => {
  it('reports CV and 95% relative margin from repeated samples', () => {
    const result = variability([8, 10, 12, 10])
    expect(result.cvPercent).toBeCloseTo(16.33, 1)
    expect(result.rmePercent).toBeCloseTo(16, 0)
  })

  it('does not invent variability for one sample', () => {
    expect(variability([10])).toEqual({ cvPercent: null, rmePercent: null })
  })
})
