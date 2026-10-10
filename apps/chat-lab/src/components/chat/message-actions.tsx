import { Check, Copy, RotateCcw } from 'lucide-react'
import { useState } from 'react'

import { useChat } from '../../hooks/use-chat'
import { useIsStreaming } from '../../store/chat-store'
import type { ChatMessage } from '../../types/message'

/** Copy raw text; regenerate is offered only on the last assistant reply. */
export function MessageActions({ message, isLast }: { message: ChatMessage; isLast: boolean }) {
  const { regenerate } = useChat()
  const streaming = useIsStreaming()
  const [copied, setCopied] = useState(false)

  return (
    <div className="mt-2 flex items-center gap-1.5">
      <button
        type="button"
        onClick={() => {
          void navigator.clipboard.writeText(message.text).then(() => {
            setCopied(true)
            setTimeout(() => setCopied(false), 1200)
          })
        }}
        className="text-faint hover:border-seam hover:text-mute flex items-center gap-1.5 rounded-md border border-transparent px-2 py-1 font-mono text-[10.5px] tracking-[0.08em] uppercase"
      >
        {copied ? <Check className="text-pulse size-3" /> : <Copy className="size-3" />}
        {copied ? 'copied' : 'copy raw'}
      </button>
      {isLast && !streaming ? (
        <button
          type="button"
          onClick={regenerate}
          className="text-faint hover:border-seam hover:text-mute flex items-center gap-1.5 rounded-md border border-transparent px-2 py-1 font-mono text-[10.5px] tracking-[0.08em] uppercase"
        >
          <RotateCcw className="size-3" />
          regenerate
        </button>
      ) : null}
    </div>
  )
}
