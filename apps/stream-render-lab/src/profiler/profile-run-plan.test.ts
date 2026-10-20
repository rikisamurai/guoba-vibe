import { describe, expect, it } from 'vitest'

import { DEFAULT_AB_CONFIG } from './ab-types'
import { createProfileRunPlan } from './profile-run-plan'

describe('createProfileRunPlan', () => {
  it('alternates AB and BA while keeping warmups paired', () => {
    const plan = createProfileRunPlan({
      ...DEFAULT_AB_CONFIG,
      challenger: 'M1',
      warmups: 1,
      repetitions: 2,
    })

    expect(plan).toEqual([
      { cycle: 0, measured: false, profile: 'M0', role: 'baseline' },
      { cycle: 0, measured: false, profile: 'M1', role: 'challenger' },
      { cycle: 1, measured: true, profile: 'M1', role: 'challenger' },
      { cycle: 1, measured: true, profile: 'M0', role: 'baseline' },
      { cycle: 2, measured: true, profile: 'M0', role: 'baseline' },
      { cycle: 2, measured: true, profile: 'M1', role: 'challenger' },
    ])
  })
  it('preserves run roles when both selectors use the same strategy', () => {
    expect(
      createProfileRunPlan({
        ...DEFAULT_AB_CONFIG,
        baseline: 'M3',
        challenger: 'M3',
        warmups: 0,
        repetitions: 1,
      }),
    ).toEqual([
      { cycle: 0, measured: true, profile: 'M3', role: 'baseline' },
      { cycle: 0, measured: true, profile: 'M3', role: 'challenger' },
    ])
  })
})
