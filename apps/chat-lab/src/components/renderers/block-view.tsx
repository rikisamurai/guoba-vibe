import { memo } from 'react'

import { repairTail } from '../../engine/tail-repair'
import type { Block } from '../../types/block'
import { Markdown } from './markdown'

/**
 * One top-level block. Frozen blocks keep their object identity, so memo makes
 * them zero-cost on every commit — only the dirty tail re-renders.
 */
export const BlockView = memo(function BlockView({
  block,
  repair,
}: {
  block: Block
  repair: boolean
}) {
  const text = repair && !block.stable ? repairTail(block.raw) : block.raw
  return <Markdown text={text} />
})
