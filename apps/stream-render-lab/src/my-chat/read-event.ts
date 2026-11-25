import type { EventResult } from '../practice/types'

// A4: Read answer content only. Preserve finish_reason to distinguish length from stop.
export function createEventReader(): (data: string) => EventResult {
  return (data) => {
    if (data === '[DONE]') return { outcome: { kind: 'completed', reason: 'done' } }
    const packet = JSON.parse(data)
    return { text: packet.choices?.[0]?.delta?.content ?? '' }
  }
}
