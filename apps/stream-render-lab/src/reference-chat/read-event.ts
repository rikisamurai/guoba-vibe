import type { EventResult } from '../practice/types'

export function createEventReader(): (data: string) => EventResult {
  let reason = 'done'
  return (data) => {
    if (data === '[DONE]')
      return {
        outcome:
          reason === 'length' || reason === 'content_filter'
            ? { kind: 'incomplete', reason }
            : { kind: 'completed', reason },
      }
    const packet = JSON.parse(data)
    if (packet.error) throw new Error(packet.error.message ?? 'Provider error')
    const choice = packet.choices?.find((item: { index?: number }) => item.index === 0)
    if (typeof choice?.finish_reason === 'string') reason = choice.finish_reason
    return { text: typeof choice?.delta?.content === 'string' ? choice.delta.content : '' }
  }
}
