import { useMemo } from 'react'

import { repairTail } from '../../engine/tail-repair'
import { useSettings } from '../../store/settings-store'
import type { ChatMessage } from '../../types/message'
import { isTerminal } from '../../types/message'
import { Markdown } from './markdown'
import { ModeBlocks } from './mode-blocks'

function ModeNaive({ text }: { text: string }) {
  return <Markdown text={text} />
}

function ModePatched({ message }: { message: ChatMessage }) {
  const streaming = !isTerminal(message.phase)
  const text = useMemo(
    () => (streaming ? repairTail(message.text) : message.text),
    [streaming, message.text],
  )
  return <Markdown text={text} />
}

/**
 * The fork point: every mode receives the same committed text and derives its
 * own view. The CURRENT panel mode applies to the whole transcript so modes
 * can be compared on identical content; message.mode only records what a
 * reply streamed under.
 */
export function MessageBody({ message }: { message: ChatMessage }) {
  const mode = useSettings().mode
  return (
    <div className="text-[14.5px] leading-[1.65]">
      {mode === 'M0' ? (
        <ModeNaive text={message.text} />
      ) : mode === 'M1' ? (
        <ModePatched message={message} />
      ) : (
        <ModeBlocks message={message} />
      )}
    </div>
  )
}
