import type { ChatToolCallDelta } from './chat-payload'
import type { EventOrigin, PartKind, SourceEvent } from './types'

export interface ChatOpenPart {
  id: string
  kind: PartKind
  choiceIndex: number
}

export function appendChatText(
  events: SourceEvent[],
  ordinal: number,
  choiceIndex: number,
  kind: Extract<PartKind, 'reasoning' | 'answer'>,
  text: string | null | undefined,
  openParts: Map<string, ChatOpenPart>,
): void {
  if (!text) return
  const id = `${kind}:${choiceIndex}`
  const origin: EventOrigin = { protocol: 'chat-completions', choiceIndex }
  if (!openParts.has(id)) {
    openParts.set(id, { id, kind, choiceIndex })
    events.push({
      sourceEventOrdinal: ordinal,
      splitIndex: 0,
      origin,
      event: { type: 'part.start', partId: id, kind },
    })
  }
  events.push({
    sourceEventOrdinal: ordinal,
    splitIndex: 0,
    origin,
    event: { type: 'part.delta', partId: id, delta: { kind: 'text', text } },
  })
}

export function appendChatToolCalls(
  events: SourceEvent[],
  ordinal: number,
  choiceIndex: number,
  calls: ChatToolCallDelta[] | undefined,
  openParts: Map<string, ChatOpenPart>,
  toolParts: Map<string, string>,
): void {
  for (const call of calls ?? []) {
    const address = `${choiceIndex}:${call.index}`
    const id = toolParts.get(address) ?? call.id ?? `tool:${address}`
    toolParts.set(address, id)
    const origin: EventOrigin = { protocol: 'chat-completions', choiceIndex }
    if (!openParts.has(id)) {
      openParts.set(id, { id, kind: 'tool-call', choiceIndex })
      events.push({
        sourceEventOrdinal: ordinal,
        splitIndex: 0,
        origin,
        event: { type: 'part.start', partId: id, kind: 'tool-call' },
      })
    }
    if (call.function?.arguments !== undefined) {
      events.push({
        sourceEventOrdinal: ordinal,
        splitIndex: 0,
        origin,
        event: {
          type: 'part.delta',
          partId: id,
          delta: { kind: 'json', fragment: call.function.arguments },
        },
      })
    }
  }
}
