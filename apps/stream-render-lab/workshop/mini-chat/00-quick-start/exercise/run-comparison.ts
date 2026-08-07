import type { QuickStartComparison } from '../contract'
import { runProfile } from '../run-profile'

export async function runComparison(): Promise<QuickStartComparison> {
  const baseline = await runProfile('M0')
  // TODO 00: 用课程终点 profile 跑右侧，不要把 M0 结果重复比较一次。
  const challenger = await runProfile('M0')
  return { baseline, challenger }
}
