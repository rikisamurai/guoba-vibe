import type { PracticeCheck } from './checks'
import type { PreviewBlock } from './types'

const block = (raw: string, start: number, node: unknown = raw): PreviewBlock => ({
  raw,
  start,
  node,
})
const identity = (result: PreviewBlock[], previous: PreviewBlock[]) =>
  result.map((item) => (previous.includes(item) ? 'reused' : 'new'))
const linkNode = (resolved: boolean) => ({ type: resolved ? 'link' : 'text', label: 'docs' })

export const renderChecks: PracticeCheck[] = [
  {
    id: 'repair-open',
    group: 'repair',
    title: '未闭合围栏在预览副本里补上结束符',
    file: 'preview-repair.ts',
    input: '“```ts\\nconst a = 1”（没有结束围栏，末尾没有换行）',
    expected: ['```ts\nconst a = 1\n```', '\n```'],
    run(impl) {
      const result = impl.repairPreview('```ts\nconst a = 1')
      return [result.text, result.synthetic]
    },
  },
  {
    id: 'repair-closed',
    group: 'repair',
    title: '真正的结束符到达后不再重复补全',
    file: 'preview-repair.ts',
    input: '“```ts\\nconst a = 1\\n```\\n后文”',
    expected: '',
    run(impl) {
      return impl.repairPreview('```ts\nconst a = 1\n```\n后文').synthetic
    },
  },
  {
    id: 'repair-newline',
    group: 'repair',
    title: '原文以换行结尾时不多补一个换行',
    file: 'preview-repair.ts',
    input: '“~~~\\ncode\\n”',
    expected: '~~~',
    run(impl) {
      return impl.repairPreview('~~~\ncode\n').synthetic
    },
  },
  {
    id: 'repair-nested',
    group: 'repair',
    title: '较短的围栏不能关闭较长的围栏',
    file: 'preview-repair.ts',
    input: '“````md\\n```ts\\ncode\\n```\\n”（外层 4 个反引号仍未闭合）',
    expected: '````',
    run(impl) {
      return impl.repairPreview('````md\n```ts\ncode\n```\n').synthetic
    },
  },
  {
    id: 'reuse-prefix',
    group: 'reuse',
    title: '尾段增长时，未变化的前缀保持引用',
    file: 'reuse-blocks.ts',
    input: '上一帧 [“甲”, “乙”]，这一帧 [“甲”, “乙乙”]',
    expected: ['reused', 'new'],
    run(impl) {
      const previous = [block('甲', 0), block('乙', 3)]
      return identity(impl.reuseBlocks(previous, [block('甲', 0), block('乙乙', 3)]), previous)
    },
  },
  {
    id: 'reuse-meaning',
    group: 'reuse',
    title: '原文相同但含义改变的块不能复用',
    file: 'reuse-blocks.ts',
    input: '“[docs]” 原文不变；后到的定义让它从纯文本变成链接',
    expected: ['new', 'new'],
    run(impl) {
      const previous = [block('[docs]', 0, linkNode(false))]
      const next = [block('[docs]', 0, linkNode(true)), block('[docs]: /a', 8)]
      return identity(impl.reuseBlocks(previous, next), previous)
    },
  },
  {
    id: 'reuse-position',
    group: 'reuse',
    title: '原文相同但位置移动的块不能复用',
    file: 'reuse-blocks.ts',
    input: '上一帧 “乙” 起点为 3；这一帧同一位次的 “乙” 起点为 5',
    expected: ['reused', 'new'],
    run(impl) {
      const previous = [block('甲', 0), block('乙', 3)]
      return identity(impl.reuseBlocks(previous, [block('甲', 0), block('乙', 5)]), previous)
    },
  },
  {
    id: 'suffix-tail',
    group: 'suffix',
    title: '三个独立段落只重算最后一块',
    file: 'dirty-start.ts',
    input: '上一帧的块：[paragraph, paragraph, paragraph]',
    expected: 2,
    run(impl) {
      return impl.dirtyBlockIndex([
        { type: 'paragraph' },
        { type: 'paragraph' },
        { type: 'paragraph' },
      ])
    },
  },
  {
    id: 'suffix-single',
    group: 'suffix',
    title: '只有一块时没有稳定边界，回退全文',
    file: 'dirty-start.ts',
    input: '上一帧的块：[paragraph]',
    expected: null,
    run(impl) {
      return impl.dirtyBlockIndex([{ type: 'paragraph' }])
    },
  },
  {
    id: 'suffix-list',
    group: 'suffix',
    title: '尾段可能并入前面的列表，要从列表重算',
    file: 'dirty-start.ts',
    input: '上一帧的块：[paragraph, list, paragraph]',
    expected: 1,
    run(impl) {
      return impl.dirtyBlockIndex([{ type: 'paragraph' }, { type: 'list' }, { type: 'paragraph' }])
    },
  },
  {
    id: 'suffix-definition',
    group: 'suffix',
    title: '出现引用定义时回退全文',
    file: 'dirty-start.ts',
    input: '上一帧的块：[paragraph, paragraph（含链接定义）, paragraph]',
    expected: null,
    run(impl) {
      return impl.dirtyBlockIndex([
        { type: 'paragraph' },
        { type: 'paragraph', hasDefinition: true },
        { type: 'paragraph' },
      ])
    },
  },
]
