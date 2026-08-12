import { useCallback, useRef, useState } from 'react'
import { chatDeltas, createDeltaBatcher } from 'stream-render-core'
import type { ChatDelta, StreamStatus } from 'stream-render-core'

import type { ChatMessage, ProviderId } from './chat-types'

export interface UiMessage {
  id: number
  role: 'user' | 'assistant'
  text: string
  reasoning: string
  status: StreamStatus
  error?: string
}

export function useChatStream() {
  const [messages, setMessages] = useState<UiMessage[]>([])
  const [streaming, setStreaming] = useState(false)
  const abortRef = useRef<AbortController | null>(null)
  const idRef = useRef(1)

  const stop = useCallback(() => abortRef.current?.abort(), [])

  const send = useCallback(
    async (provider: ProviderId, input: string) => {
      const text = input.trim()
      if (!text || abortRef.current) return

      const history: ChatMessage[] = [
        ...messages.filter((m) => m.text !== '').map((m) => ({ role: m.role, content: m.text })),
        { role: 'user', content: text },
      ]

      const userId = idRef.current++
      const assistantId = idRef.current++
      setMessages((prev) => [
        ...prev,
        { id: userId, role: 'user', text, reasoning: '', status: 'final' },
        { id: assistantId, role: 'assistant', text: '', reasoning: '', status: 'streaming' },
      ])
      setStreaming(true)

      const controller = new AbortController()
      abortRef.current = controller

      const batcher = createDeltaBatcher<ChatDelta>((batch) => {
        setMessages((prev) =>
          prev.map((m) => {
            if (m.id !== assistantId) return m
            let { text: t, reasoning } = m
            for (const d of batch) {
              if (d.content) t += d.content
              if (d.reasoning) reasoning += d.reasoning
            }
            return { ...m, text: t, reasoning }
          }),
        )
      })

      let finalStatus: StreamStatus = 'final'
      let error: string | undefined
      try {
        const res = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ provider, messages: history }),
          signal: controller.signal,
        })
        if (!res.ok || !res.body) {
          throw new Error(`API ${res.status}: ${await res.text().catch(() => '')}`)
        }
        for await (const delta of chatDeltas(res.body)) batcher.push(delta)
      } catch (err) {
        if (controller.signal.aborted) {
          finalStatus = 'cancelled'
        } else {
          finalStatus = 'error'
          error = err instanceof Error ? err.message : String(err)
        }
      } finally {
        batcher.flush()
        abortRef.current = null
        setStreaming(false)
        setMessages((prev) =>
          prev.map((m) => (m.id === assistantId ? { ...m, status: finalStatus, error } : m)),
        )
      }
    },
    [messages],
  )

  return { messages, streaming, send, stop }
}
