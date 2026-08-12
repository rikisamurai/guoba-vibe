import type { SseEvent } from '../../05-sse/contract'
import type { ChatCompletionEvent } from '../contract'

export function adaptChatCompletions(_events: readonly SseEvent[]): readonly ChatCompletionEvent[] {
  // TODO 06: turn provider JSON and [DONE] into typed mini-chat events.
  return []
}
