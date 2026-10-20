import type { RenderProfile } from '../engine/types'
import { myRenderPolicy } from '../my-chat/render-policy'
import type { AbProfile } from './ab-types'

export const PROFILE_OPTIONS: readonly { value: AbProfile; label: string }[] = [
  { value: 'M0', label: 'M0 · 每个 delta 全文解析' },
  { value: 'M1', label: 'M1 · 按帧合并更新' },
  { value: 'M2', label: 'M2 · 预览修复与稳定块' },
  { value: 'M3', label: 'M3 · 仅解析变化尾部' },
  { value: 'M4', label: 'M4 · 增加重型节点调度' },
  { value: 'mine', label: '我的实现 · render-policy.ts' },
]

export function resolveProfile(profile: AbProfile) {
  return profile === 'mine' ? myRenderPolicy.profile : profile
}

export function profileLabel(
  profile: AbProfile,
  resolved: RenderProfile = resolveProfile(profile),
): string {
  return profile === 'mine' ? `我的实现 (${resolved})` : profile
}
