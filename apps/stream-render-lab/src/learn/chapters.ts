import type { MDXContent } from 'mdx/types'

import QuickStart from '../content/01-quick-start.mdx'
import DeterministicRuntime from '../content/02-deterministic-runtime.mdx'
import BytesUtf8 from '../content/03-bytes-utf8.mdx'
import Sse from '../content/04-sse.mdx'
import Protocols from '../content/05-protocols.mdx'
import MZero from '../content/06-m0.mdx'
import MOne from '../content/07-m1.mdx'
import PreviewRepair from '../content/08-preview-repair.mdx'
import MTwo from '../content/09-m2.mdx'
import MThree from '../content/10-m3.mdx'
import MFour from '../content/11-m4.mdx'
import Ship from '../content/12-ship.mdx'

export interface Chapter {
  Content: MDXContent
  description: string
  duration: string
  eyebrow: string
  index: string
  lead: string
  shortTitle: string
  slug: string
  title: string
}

export const CHAPTERS: Chapter[] = [
  {
    Content: QuickStart,
    index: '01',
    slug: 'quick-start',
    shortTitle: '快速起步',
    title: '快速起步：先看见 M0 与 M4 的差异',
    eyebrow: 'QUICK START · OBSERVE FIRST',
    duration: '18 MIN',
    description: '用同一份 trace 观察全文重算与稳定尾部之间的差异。',
    lead: '先不看实现。重放同一份输入，用肉眼和指标建立对流式渲染问题的第一个直觉。',
  },
  {
    Content: DeterministicRuntime,
    index: '02',
    slug: 'deterministic-runtime',
    shortTitle: '确定性运行时',
    title: '确定性运行时：把时间变成依赖',
    eyebrow: 'RUNTIME · VIRTUAL CLOCK',
    duration: '24 MIN',
    description: '注入 EngineClock，让 frame、timer、replay 和 drain 可控。',
    lead: '如果测试无法精确推进一帧，后面的调度、debounce 和重型任务断言都只是猜测。',
  },
  {
    Content: BytesUtf8,
    index: '03',
    slug: 'bytes-utf8',
    shortTitle: '字节与 UTF-8',
    title: '字节到文本：守住 UTF-8 边界',
    eyebrow: 'TRANSPORT · BYTES / UTF-8',
    duration: '20 MIN',
    description: '在任意 byte split 下正确还原 Unicode 文本。',
    lead: '网络 chunk 不是字符边界。一个汉字、emoji，甚至换行都可能被拆开。',
  },
  {
    Content: Sse,
    index: '04',
    slug: 'sse',
    shortTitle: 'SSE 状态机',
    title: 'SSE：从任意文本块还原事件',
    eyebrow: 'TRANSPORT · WHATWG SSE',
    duration: '28 MIN',
    description: '实现 BOM、换行、多行 data、comment 与 EOF 规则。',
    lead: '这一章不靠 split("\\n\\n")。我们按 WHATWG 规则让每个边界都可被测试。',
  },
  {
    Content: Protocols,
    index: '05',
    slug: 'protocols',
    shortTitle: '三种协议',
    title: '三种协议：归一化而不抹平语义',
    eyebrow: 'ADAPTERS · DEEPSEEK',
    duration: '32 MIN',
    description: '对比 Chat Completions、Responses 与 Anthropic Messages。',
    lead: '统一事件模型要简化渲染引擎，但不能把 sequence number、block index 和终态证据混为一谈。',
  },
  {
    Content: MZero,
    index: '06',
    slug: 'm0',
    shortTitle: 'M0 全文重算',
    title: 'M0：建立全文重算基线',
    eyebrow: 'RENDER · BASELINE',
    duration: '22 MIN',
    description: '每个 delta 全量 parse/render，换来最简单的正确性 oracle。',
    lead: '先做慢但可信的版本。后续每一次优化，都要与它对照语义。',
  },
  {
    Content: MOne,
    index: '07',
    slug: 'm1',
    shortTitle: 'M1 帧批处理',
    title: 'M1：分开 ingest 与 display clocks',
    eyebrow: 'SCHEDULER · FRAME BATCHING',
    duration: '26 MIN',
    description: '高频到达合并为每帧最多一次 preview commit。',
    lead: '网络不替 React 决定提交频率。引擎需要在及时显示与主线程预算之间做明确选择。',
  },
  {
    Content: PreviewRepair,
    index: '08',
    slug: 'preview-repair',
    shortTitle: 'Preview repair',
    title: 'Preview repair：修补显示，不污染事实',
    eyebrow: 'MARKDOWN · INCOMPLETE SYNTAX',
    duration: '30 MIN',
    description: '临时补齐半截语法，并用 synthetic range 标记。',
    lead: '用户需要可读的中间态，引擎则需要一份从不被修改的 raw canonical truth。',
  },
  {
    Content: MTwo,
    index: '09',
    slug: 'm2',
    shortTitle: 'M2 稳定块',
    title: 'M2：冻结稳定块',
    eyebrow: 'REACT · STRUCTURAL SHARING',
    duration: '34 MIN',
    description: '为顶层 block 建立稳定 identity，阻止无关重渲染。',
    lead: '全文 parse 仍然可以发生，但已完成的 React subtree 不应因为尾部新 token 而重做工作。',
  },
  {
    Content: MThree,
    index: '10',
    slug: 'm3',
    shortTitle: 'M3 有界尾部',
    title: 'M3：只重解析有界尾部',
    eyebrow: 'MARKDOWN · CHECKPOINTS',
    duration: '42 MIN',
    description: '在 root-level quiescent checkpoint 后做 suffix reparse 与 AST stitching。',
    lead: '这不是 resumable parser。我们只在可证明的稳定前缀后切分，其余情况明确退化。',
  },
  {
    Content: MFour,
    index: '11',
    slug: 'm4',
    shortTitle: 'M4 重型节点',
    title: 'M4：调度重型节点',
    eyebrow: 'HEAVY WORK · REVISION GUARDS',
    duration: '38 MIN',
    description: '增量 Shiki，并为 Mermaid/KaTeX 加 debounce 与 stale guard。',
    lead: '文本可以每帧提交，代码高亮、图表和公式却有自己的成本曲线与过期风险。',
  },
  {
    Content: Ship,
    index: '12',
    slug: 'ship',
    shortTitle: '发布与证据',
    title: 'Ship：把正确性、性能与安全一起交付',
    eyebrow: 'PRODUCTION · PROOF',
    duration: '36 MIN',
    description: '联系 accessibility、security、Profiler、Chat 与 Bench。',
    lead: '前沿不等于激进默认值。最后一章把退化路径、测量证据与产品约束收束成可发布系统。',
  },
]

export function getChapter(slug: string) {
  const index = CHAPTERS.findIndex((chapter) => chapter.slug === slug)

  return index < 0 ? undefined : { chapter: CHAPTERS[index], index }
}
