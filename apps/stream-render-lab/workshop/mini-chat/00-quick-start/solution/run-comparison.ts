import type { QuickStartComparison } from '../contract'
import { runProfile } from '../run-profile'

export async function runComparison(): Promise<QuickStartComparison> {
  const baseline = await runProfile('M0')
  const challenger = await runProfile('M4')
  return { baseline, challenger }
}
