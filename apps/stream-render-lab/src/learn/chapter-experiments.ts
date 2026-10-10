import type { RenderProfile, RevealMode, TraceLevel } from '../engine/types'
import { textReplayRecords } from '../fixtures/text-replay'
import type { ReplayRecord } from '../replay/replay-source'

export interface ChapterExperiment {
  observation: string
  profile: RenderProfile
  records: readonly ReplayRecord[]
  reveal: RevealMode
  trace: TraceLevel
}

interface Definition {
  chunks: readonly string[]
  observation: string
  profile: RenderProfile
  stepMs?: number
}

const DEFINITIONS: Record<string, Definition> = {
  'quick-start': {
    profile: 'M4',
    chunks: [
      '## 同一份回答\n\n',
      '- raw 不变\n',
      '- visible 按帧发布\n\n',
      '```ts\nrender(tail)\n```',
    ],
    observation: '观察 commit 与 parse work，而不是只看最终文本。',
  },
  'deterministic-runtime': {
    profile: 'M1',
    stepMs: 16,
    chunks: ['frame 0 → ', 'delta A → ', 'delta B → ', 'drain'],
    observation: '相邻 delta 被显示时钟合并，终态仍会完整 drain。',
  },
  'bytes-utf8': {
    profile: 'M0',
    chunks: ['边界字符：', '中', '文 ', '👩‍💻'],
    observation: 'Replay 已接收解码后的 Unicode；字节切分测试位于 transport 层。',
  },
  sse: {
    profile: 'M0',
    chunks: ['data 第一行\n', 'data 第二行\n\n', '事件已派发。'],
    observation: '空行派发发生在 adapter 之前；这里检查归一化后的有序 delta。',
  },
  protocols: {
    profile: 'M0',
    chunks: ['Responses sequence ≠ ', 'Anthropic block index ≠ ', 'internalSeq。'],
    observation: '检查 throughInternalSeq，它只描述引擎内的归一化顺序。',
  },
  m0: {
    profile: 'M0',
    chunks: ['每个 ', 'delta ', '都触发 ', '**全文 parse**。'],
    observation: 'preview parse passes 随 delta 数增长，它是后续模式的正确性 oracle。',
  },
  m1: {
    profile: 'M1',
    stepMs: 5,
    chunks: ['A', 'B', 'C', 'D', 'E', ' → 一帧可见'],
    observation: 'internal events 可以多于 commits；ingest clock 不等于 display clock。',
  },
  'preview-repair': {
    profile: 'M2',
    chunks: ['这段 **强调', '仍未结束', '**，raw 从未被补写。'],
    observation: '中间态可修补，settled 后必须移除 synthetic range 并 canonical parse。',
  },
  m2: {
    profile: 'M2',
    chunks: ['第一段稳定。\n\n', '第二段', '继续增长', '，第一段 identity 不变。'],
    observation: '关注 commits 与稳定 root block，而不是假设 full parse 已经消失。',
  },
  m3: {
    profile: 'M3',
    chunks: ['稳定段落。\n\n', '尾部段落', '继续增长', '。'],
    observation: '有 root checkpoint 时只重解析 suffix；无 checkpoint 时明确退化。',
  },
  m4: {
    profile: 'M4',
    chunks: ['```ts\n', 'const answer = ', '42\n', '```'],
    observation: 'heavy work 与 block revision 绑定，过期结果不能覆盖新版本。',
  },
  ship: {
    profile: 'production',
    chunks: ['最终证据：\n\n', '- canonical parse\n', '- a11y\n', '- benchmark'],
    observation: '发布配置使用 direct frame batching，并保留完整终态与诊断。',
  },
}

export const CHAPTER_EXPERIMENTS: Readonly<Record<string, ChapterExperiment>> = Object.fromEntries(
  Object.entries(DEFINITIONS).map(([slug, definition]) => [
    slug,
    {
      observation: definition.observation,
      profile: definition.profile,
      records: textReplayRecords({
        chunks: definition.chunks,
        id: `lesson-${slug}`,
        stepMs: definition.stepMs ?? 54,
      }),
      reveal: 'direct' as const,
      trace: 'full' as const,
    },
  ]),
)

export function getChapterExperiment(slug: string): ChapterExperiment | undefined {
  return CHAPTER_EXPERIMENTS[slug]
}
