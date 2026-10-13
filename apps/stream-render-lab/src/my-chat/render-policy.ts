import type { RenderProfile } from '../engine/types'

// 学员入口：修改 profile 后，在性能实验中选择「我的实现」并重新采样。
// 这里选择已有引擎策略，不会替换你的 HTTP 读取、SSE 解析或聊天状态实现。
export const myRenderPolicy: { profile: Exclude<RenderProfile, 'production'> } = {
  profile: 'M0',
}
