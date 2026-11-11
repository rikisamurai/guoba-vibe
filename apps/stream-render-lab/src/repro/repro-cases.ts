import type { RenderProfile } from '../engine/types'
import { textReplayRecords } from '../fixtures/text-replay'
import type { ReplayRecord } from '../replay/replay-source'

interface Diagnosis {
  label: string
  text: string
}

export interface ReproCase {
  cuts: number
  diagnoses: readonly Diagnosis[]
  id: string
  raw: string
  records: readonly ReplayRecord[]
  steps: readonly string[]
  symptom: string
  target: Exclude<RenderProfile, 'M0' | 'production'>
  title: string
}

function defineCase(
  input: Omit<ReproCase, 'raw' | 'records'> & {
    chunks: readonly string[]
    stepMs: number
  },
): ReproCase {
  const { chunks, stepMs, ...definition } = input
  return {
    ...definition,
    raw: chunks.join(''),
    records: textReplayRecords({ chunks, id: `repro-${input.id}`, stepMs }),
  }
}

export const REPRO_CASES: Readonly<Record<string, ReproCase>> = {
  'broken-fence': defineCase({
    id: 'broken-fence',
    title: 'broken fence',
    symptom: '代码围栏在结束标记到达前，会改变后续内容的块类型。',
    target: 'M3',
    cuts: 4,
    stepMs: 210,
    chunks: ['```ts\n', 'const answer = **4', '2**\n', '```\n'],
    steps: [
      '发送开围栏与语言标识',
      '停在围栏内的强调符号中间',
      '补齐代码行，但暂不关闭围栏',
      '发送闭围栏并进入 canonical parse',
    ],
    diagnoses: [
      { label: '症状', text: '尾部在 fence 未闭合时一直属于代码块。' },
      { label: '风险', text: '把 EOF 闭合作为稳定证据会错误冻结 dirty tail。' },
      { label: '不变量', text: 'preview repair 不能写入保存的 raw text。' },
      { label: '策略', text: 'M3 保留最后一个 root child，终态执行完整 parse。' },
    ],
  }),
  'split-emoji': defineCase({
    id: 'split-emoji',
    title: 'split emoji',
    symptom: '按 UTF-16 code unit 显示时，一个 emoji 可能短暂成为替代字符。',
    target: 'M1',
    cuts: 3,
    stepMs: 240,
    chunks: ['完成了：\uD83D', '\uDC69‍', '💻'],
    steps: [
      '发送 emoji 的高位 surrogate',
      '发送低位 surrogate 与连接符',
      '发送最后一个 glyph 并完成 drain',
    ],
    diagnoses: [
      { label: '症状', text: '不完整 surrogate 在中间态可能显示为替代字符。' },
      { label: '原因', text: 'display cursor 若按 code unit 推进，会切开 grapheme。' },
      { label: '约束', text: '最终 raw 必须精确还原为完整 👩‍💻。' },
      { label: '策略', text: '网络层先流式 UTF-8 decode；显示层以安全边界推进。' },
    ],
  }),
}

export function getReproCase(id: string): ReproCase {
  return REPRO_CASES[id] ?? REPRO_CASES['broken-fence']
}
