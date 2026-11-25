import { adaptAnthropicMessages } from './anthropic'
import { adaptChatCompletions } from './chat-completions'
import { adaptResponses } from './responses'
import { parseSse, type SseStreamHooks } from './sse'
import type { SourceEvent } from './types'

export type WireProtocol = 'chat-completions' | 'responses' | 'anthropic'

export function adaptProtocolStream(
  protocol: WireProtocol,
  chunks: AsyncIterable<Uint8Array>,
  hooks?: SseStreamHooks,
): AsyncIterable<SourceEvent> {
  const events = parseSse(chunks, hooks)
  if (protocol === 'chat-completions') return adaptChatCompletions(events)
  if (protocol === 'responses') return adaptResponses(events)
  return adaptAnthropicMessages(events)
}
