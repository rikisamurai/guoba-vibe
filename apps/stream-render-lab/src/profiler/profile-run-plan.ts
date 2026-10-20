import type { AbProfile, AbProfileConfig, ProfileRole } from './ab-types'

export interface PlannedProfileRun {
  cycle: number
  measured: boolean
  profile: AbProfile
  role: ProfileRole
}

export function createProfileRunPlan(config: AbProfileConfig): readonly PlannedProfileRun[] {
  const cycles = config.warmups + config.repetitions
  const plan: PlannedProfileRun[] = []
  for (let cycle = 0; cycle < cycles; cycle += 1) {
    const roles: ProfileRole[] =
      cycle % 2 === 0 ? ['baseline', 'challenger'] : ['challenger', 'baseline']
    for (const role of roles) {
      plan.push({ cycle, measured: cycle >= config.warmups, profile: config[role], role })
    }
  }
  return plan
}
