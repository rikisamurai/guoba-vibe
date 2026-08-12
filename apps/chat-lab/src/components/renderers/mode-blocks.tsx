import { useEffect } from 'react'

import { finalizeBlocks, splitBlocks } from '../../engine/block-splitter'
import { metrics } from '../../engine/metrics'
import type { ChatMessage } from '../../types/message'
import { isTerminal } from '../../types/message'
import { BlockView } from './block-view'

/**
 * M2/M3: render the block partition. Streaming pushes re-lex only the dirty
 * tail; the terminal phase runs one full reconcile so any mid-stream freeze
 * mistakes are corrected against the raw text.
 */
export function ModeBlocks({ message, heavy }: { message: ChatMessage; heavy: boolean }) {
  const terminal = isTerminal(message.phase)
  const split = terminal
    ? finalizeBlocks(message.id, message.text)
    : splitBlocks(message.id, message.text)
  useEffect(() => {
    if (!terminal) metrics.onSplit(split.tailParseMs, split.stableCount, split.blocks.length)
  }, [terminal, split])
  const last = split.blocks.length - 1
  return (
    <>
      {split.blocks.map((block, index) => (
        <BlockView
          key={block.id}
          block={block}
          repair={!terminal && index === last}
          heavy={heavy}
        />
      ))}
    </>
  )
}
