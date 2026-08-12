import { ArrowUp, Square } from 'lucide-react'
import { useState } from 'react'

import { useChat } from '../../hooks/use-chat'
import { useIsStreaming } from '../../store/chat-store'

export function Composer() {
  const [draft, setDraft] = useState('')
  const { send, stop } = useChat()
  const streaming = useIsStreaming()

  return (
    <div className="border-seam border-t px-7 pt-4 pb-5">
      <form
        className="border-seam bg-panel mx-auto flex max-w-[720px] items-center gap-3 rounded-xl border py-3 pr-3 pl-4"
        onSubmit={(event) => {
          event.preventDefault()
          if (streaming) return
          send(draft)
          setDraft('')
        }}
      >
        <input
          type="text"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder="Ask anything…"
          className="text-ink placeholder:text-faint flex-1 bg-transparent text-sm outline-none"
        />
        {streaming ? (
          <button
            type="button"
            onClick={stop}
            className="bg-pulse text-void flex items-center gap-2 rounded-lg px-4 py-2 font-mono text-[12.5px] font-medium"
          >
            <Square className="fill-void size-3" />
            Stop
          </button>
        ) : (
          <button
            type="submit"
            disabled={draft.trim() === ''}
            className="bg-pulse text-void flex items-center gap-2 rounded-lg px-4 py-2 font-mono text-[12.5px] font-medium disabled:opacity-40"
          >
            <ArrowUp className="size-3.5" />
            Send
          </button>
        )}
      </form>
    </div>
  )
}
