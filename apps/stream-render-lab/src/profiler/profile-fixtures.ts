import type { AbProfileConfig, ProfileFixture } from './ab-types'

export const PROFILE_FIXTURES: readonly { value: ProfileFixture; label: string }[] = [
  { value: 'mixed-markdown', label: '混合 Markdown · 通用基线' },
  { value: 'stable-paragraphs', label: '大量独立段落 · 尾部解析' },
  { value: 'code-math', label: '代码与公式 · 重型节点' },
]

const BLOCKS: Record<ProfileFixture, string> = {
  'mixed-markdown':
    '## Streaming Markdown\n\n网络到达频率不等于浏览器适合提交 UI 的频率。\n\n- raw 是事实源\n- visible 服从显示时钟\n\n```ts\nrequestAnimationFrame(() => commit(raw))\n```\n\n',
  'stable-paragraphs':
    '## 已完成段落\n\n这一段已经稳定。继续追加新的文本时，观察前面的内容是否被反复解析。每一个空行都给出了新的块边界。\n\n第二段保持普通文本，没有跨段引用，适合对比全文解析和尾部解析的工作量。\n\n',
  'code-math':
    '## 代码与公式\n\n```typescript\nfunction append(raw: string, delta: string) {\n  return raw + delta\n}\n```\n\n$$\nE = mc^2\n$$\n\n',
}

export function buildProfileText(config: Pick<AbProfileConfig, 'fixture' | 'textKChars'>): string {
  const block = BLOCKS[config.fixture]
  const target = config.textKChars * 1024
  return block.repeat(Math.ceil(target / block.length)).slice(0, target)
}
