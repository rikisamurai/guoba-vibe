import { useCallback, useRef, useState } from 'react'
import { chatDeltas, createDeltaBatcher } from 'stream-render-core'
import type { ChatDelta, StreamStatus } from 'stream-render-core'

import type { ChatMessage, ProviderId } from './chat-types'
import { buildReplayStream, describeReplay } from './replay-config'
import type { ReplayConfig } from './replay-config'

export interface UiMessage {
  id: number
  role: 'user' | 'assistant'
  text: string
  reasoning: string
  status: StreamStatus
  error?: string
}

export interface StreamMetrics {
  networkChunks: number
  sseEvents: number
  uiCommits: number
  elapsedMs: number
}

const ZERO_METRICS: StreamMetrics = { networkChunks: 0, sseEvents: 0, uiCommits: 0, elapsedMs: 0 }

export function useStreamSession() {
  const [messages, setMessages] = useState<UiMessage[]>([])
  const [streaming, setStreaming] = useState(false)
  const [metrics, setMetrics] = useState<StreamMetrics>(ZERO_METRICS)
  const abortRef = useRef<AbortController | null>(null)
  const idRef = useRef(1)

  const stop = useCallback(() => abortRef.current?.abort(), [])

  const begin = useCallback((userText: string) => {
    const controller = new AbortController()
    abortRef.current = controller
    const userId = idRef.current++
    const assistantId = idRef.current++
    setMessages((prev) => [
      ...prev,
      { id: userId, role: 'user', text: userText, reasoning: '', status: 'final' },
      { id: assistantId, role: 'assistant', text: '', reasoning: '', status: 'streaming' },
    ])
    setStreaming(true)
    setMetrics(ZERO_METRICS)
    return { controller, assistantId }
  }, [])

  const consume = useCallback(
    async (assistantId: number, body: ReadableStream<Uint8Array>, controller: AbortController) => {
      const startedAt = performance.now()
      const counts = { networkChunks: 0, sseEvents: 0, uiCommits: 0 }
      const refresh = () =>
        setMetrics({ ...counts, elapsedMs: Math.round(performance.now() - startedAt) })

      const counted = body.pipeThrough(
        new TransformStream<Uint8Array, Uint8Array>({
          transform(chunk, ctrl) {
            counts.networkChunks++
            ctrl.enqueue(chunk)
          },
        }),
      )

      const batcher = createDeltaBatcher<ChatDelta>((batch) => {
        counts.uiCommits++
        setMessages((prev) =>
          prev.map((m) => {
            if (m.id !== assistantId) return m
            let { text, reasoning } = m
            for (const d of batch) {
              if (d.content) text += d.content
              if (d.reasoning) reasoning += d.reasoning
            }
            return { ...m, text, reasoning }
          }),
        )
        refresh()
      })

      let finalStatus: StreamStatus = 'final'
      let error: string | undefined
      try {
        for await (const delta of chatDeltas(counted)) {
          // 回放流不认识 AbortController，这里手动放行取消
          if (controller.signal.aborted) throw new DOMException('aborted', 'AbortError')
          counts.sseEvents++
          batcher.push(delta)
        }
      } catch (err) {
        if (controller.signal.aborted) {
          finalStatus = 'cancelled'
        } else {
          finalStatus = 'error'
          error = err instanceof Error ? err.message : String(err)
        }
      } finally {
        batcher.flush()
        refresh()
        abortRef.current = null
        setStreaming(false)
        setMessages((prev) =>
          prev.map((m) => (m.id === assistantId ? { ...m, status: finalStatus, error } : m)),
        )
      }
    },
    [],
  )

  const send = useCallback(
    async (provider: ProviderId, input: string) => {
      const text = input.trim()
      if (!text || abortRef.current) return

      const history: ChatMessage[] = [
        ...messages.filter((m) => m.text !== '').map((m) => ({ role: m.role, content: m.text })),
        { role: 'user', content: text },
      ]
      const { controller, assistantId } = begin(text)

      let body: ReadableStream<Uint8Array> | null = null
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
        body = res.body
      } catch (err) {
        const aborted = controller.signal.aborted
        error = err instanceof Error ? err.message : String(err)
        abortRef.current = null
        setStreaming(false)
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId
              ? {
                  ...m,
                  status: aborted ? 'cancelled' : 'error',
                  error: aborted ? undefined : error,
                }
              : m,
          ),
        )
        return
      }
      await consume(assistantId, body, controller)
    },
    [messages, begin, consume],
  )

  const replay = useCallback(
    (config: ReplayConfig) => {
      if (abortRef.current) return
      const { controller, assistantId } = begin(describeReplay(config))
      void consume(assistantId, buildReplayStream(config), controller)
    },
    [begin, consume],
  )

  return { messages, streaming, metrics, send, replay, stop }
}
