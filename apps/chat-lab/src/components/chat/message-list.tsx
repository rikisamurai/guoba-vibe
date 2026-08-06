import { useEffect, useRef } from 'react'

import { useChatMessages } from '../../store/chat-store'
import { MessageItem } from './message-item'

export function MessageList() {
  const messages = useChatMessages()
  const scrollRef = useRef<HTMLDivElement>(null)
  const pinnedToBottom = useRef(true)

  useEffect(() => {
    const el = scrollRef.current
    if (el !== null && pinnedToBottom.current) el.scrollTop = el.scrollHeight
  }, [messages])

  return (
    <div
      ref={scrollRef}
      onScroll={() => {
        const el = scrollRef.current
        if (el === null) return
        pinnedToBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80
      }}
      className="flex-1 overflow-y-auto py-8"
    >
      <div className="mx-auto flex max-w-[720px] flex-col gap-6 px-7">
        {messages.length === 0 ? (
          <div className="mt-16 text-center">
            <div className="text-faint font-mono text-[11px] tracking-[0.16em] uppercase">
              no messages yet
            </div>
            <p className="text-mute mt-2 text-sm">
              Send anything — the simulator replays a markdown corpus through the renderer.
            </p>
          </div>
        ) : (
          messages.map((message, index) => (
            <MessageItem
              key={message.id}
              message={message}
              isLast={index === messages.length - 1}
            />
          ))
        )}
      </div>
    </div>
  )
}
