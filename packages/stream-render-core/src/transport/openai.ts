import { sseDataEvents } from './sse'

/** OpenAI 兼容协议的一次增量：content 是正文，reasoning 是思考流（如 kimi-k2.5） */
export interface ChatDelta {
  content?: string
  reasoning?: string
}

/**
 * data 载荷 → 结构化增量。
 * 半个 JSON 不可能出现在这里——SSE 层保证事件完整才放行；
 * 但上游偶发的畸形载荷仍按「跳过」处理，不让单条坏数据杀死整个流。
 */
export async function* chatDeltas(
  body: ReadableStream<Uint8Array>,
): AsyncGenerator<ChatDelta, void, undefined> {
  for await (const data of sseDataEvents(body)) {
    if (data === '[DONE]') return

    let payload: unknown
    try {
      payload = JSON.parse(data)
    } catch {
      continue
    }

    const delta = (payload as { choices?: { delta?: Record<string, unknown> }[] }).choices?.[0]
      ?.delta
    if (!delta) continue

    const out: ChatDelta = {}
    if (typeof delta.reasoning_content === 'string' && delta.reasoning_content !== '') {
      out.reasoning = delta.reasoning_content
    }
    if (typeof delta.content === 'string' && delta.content !== '') {
      out.content = delta.content
    }
    if (out.content !== undefined || out.reasoning !== undefined) yield out
  }
}
