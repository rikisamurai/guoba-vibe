import type { StreamEvent } from '../types/stream'

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

/**
 * Maps one OpenAI-compatible SSE data payload (DeepSeek / Kimi chat.completions
 * with stream: true) to a StreamEvent. Returns null for payloads that carry
 * nothing for us (empty deltas, unknown fields, malformed JSON).
 */
export function parseOpenAiData(data: string): StreamEvent | null {
  if (data === '[DONE]') return { type: 'done' }

  let payload: unknown
  try {
    payload = JSON.parse(data)
  } catch {
    return null
  }
  if (!isRecord(payload)) return null

  if (isRecord(payload.error)) {
    const message = payload.error.message
    return { type: 'error', message: typeof message === 'string' ? message : 'upstream error' }
  }

  const choices = payload.choices
  if (!Array.isArray(choices) || choices.length === 0) return null
  const choice: unknown = choices[0]
  if (!isRecord(choice)) return null

  if (isRecord(choice.delta)) {
    const content = choice.delta.content
    if (typeof content === 'string' && content !== '') {
      return { type: 'delta', text: content }
    }
  }

  if (typeof choice.finish_reason === 'string') {
    return { type: 'done', finishReason: choice.finish_reason }
  }
  return null
}
