import { describe, expect, it } from 'vitest'

import { DEFAULT_AB_CONFIG } from './ab-types'
import { createProfileRunPlan } from './profile-run-plan'

describe('createProfileRunPlan', () => {
  it('alternates AB and BA while keeping warmups paired', () => {
    const plan = createProfileRunPlan({
      ...DEFAULT_AB_CONFIG,
      warmups: 1,
      repetitions: 2,
    })

    expect(plan).toEqual([
      { cycle: 0, measured: false, profile: 'M0' },
      { cycle: 0, measured: false, profile: 'M1' },
      { cycle: 1, measured: true, profile: 'M1' },
      { cycle: 1, measured: true, profile: 'M0' },
      { cycle: 2, measured: true, profile: 'M0' },
      { cycle: 2, measured: true, profile: 'M1' },
    ])
  })
})
