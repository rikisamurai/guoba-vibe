import { useEffect, useRef, useState } from 'react'

import type { RendererId } from '../lib/renderers'
import type { UiMessage } from '../lib/use-stream-session'
import { MessageItem } from './message-item'

export interface ChatPanelProps {
  messages: UiMessage[]
  renderer: RendererId
  streaming: boolean
  inputDisabled: boolean
  onSend: (text: string) => void
  onStop: () => void
}

export function ChatPanel({
  messages,
  renderer,
  streaming,
  inputDisabled,
  onSend,
  onStop,
}: ChatPanelProps) {
  const [input, setInput] = useState('')
  const scrollRef = useRef<HTMLDivElement>(null)
  const nearBottomRef = useRef(true)

  // 滚动服从用户意图：只有本就贴近底部时才跟随（文档基线第 7 条）
  useEffect(() => {
    const el = scrollRef.current
    if (el && nearBottomRef.current) el.scrollTop = el.scrollHeight
  }, [messages])

  const submit = () => {
    if (streaming || input.trim() === '') return
    onSend(input)
    setInput('')
    nearBottomRef.current = true
  }

  return (
    <div className="flex min-w-0 flex-1 flex-col">
      <div
        ref={scrollRef}
        onScroll={(e) => {
          const el = e.currentTarget
          nearBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80
        }}
        className="flex-1 space-y-4 overflow-y-auto px-4 py-4"
      >
        {messages.length === 0 && (
          <div className="flex h-full items-center justify-center text-sm text-neutral-600">
            发条消息，或在控制台切到回放模式播放压力样本
          </div>
        )}
        {messages.map((m) => (
          <MessageItem key={m.id} message={m} renderer={renderer} />
        ))}
      </div>

      <div className="border-t border-neutral-800 p-3">
        <div className="flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.nativeEvent.isComposing) submit()
            }}
            disabled={inputDisabled}
            placeholder={inputDisabled ? '回放模式下输入已禁用' : '输入消息，Enter 发送'}
            className="min-w-0 flex-1 rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm outline-none placeholder:text-neutral-600 focus:border-indigo-500 disabled:opacity-50"
          />
          {streaming ? (
            <button
              onClick={onStop}
              className="shrink-0 rounded-lg bg-red-600/80 px-4 py-2 text-sm hover:bg-red-600"
            >
              停止
            </button>
          ) : (
            <button
              onClick={submit}
              disabled={inputDisabled || input.trim() === ''}
              className="shrink-0 rounded-lg bg-indigo-600 px-4 py-2 text-sm hover:bg-indigo-500 disabled:opacity-40"
            >
              发送
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
