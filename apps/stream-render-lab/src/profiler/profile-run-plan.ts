import type { AbProfile, AbProfileConfig } from './ab-types'

export interface PlannedProfileRun {
  cycle: number
  measured: boolean
  profile: AbProfile
}

export function createProfileRunPlan(config: AbProfileConfig): readonly PlannedProfileRun[] {
  const cycles = config.warmups + config.repetitions
  const plan: PlannedProfileRun[] = []
  for (let cycle = 0; cycle < cycles; cycle += 1) {
    const profiles =
      cycle % 2 === 0 ? [config.baseline, config.challenger] : [config.challenger, config.baseline]
    for (const profile of profiles) {
      plan.push({ cycle, measured: cycle >= config.warmups, profile })
    }
  }
  return plan
}
