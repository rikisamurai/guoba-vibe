import { memo } from 'react'

import { repairTail } from '../../engine/tail-repair'
import type { Block } from '../../types/block'
import { CodeBlock } from './code-block'
import { Markdown } from './markdown'
import { MermaidBlock } from './mermaid-block'

/**
 * One top-level block. Frozen blocks keep their object identity, so memo makes
 * them zero-cost on every commit — only the dirty tail re-renders. With heavy
 * mode (M3) code and mermaid blocks get their own renderers and clocks.
 */
export const BlockView = memo(function BlockView({
  block,
  repair,
  heavy,
}: {
  block: Block
  repair: boolean
  heavy: boolean
}) {
  if (heavy && block.kind === 'code') return <CodeBlock block={block} />
  if (heavy && block.kind === 'mermaid') return <MermaidBlock block={block} />
  const text = repair && !block.stable ? repairTail(block.raw) : block.raw
  return <Markdown text={text} />
})
