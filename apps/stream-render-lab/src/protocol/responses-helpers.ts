import type { ResponsesPayload } from './responses-payload'
import type { EventOrigin, RunOutcome, SourceEvent, StreamEvent } from './types'

export function* wrapEvents(
  ordinal: number,
  origin: EventOrigin,
  events: StreamEvent[],
): Generator<SourceEvent> {
  for (const [splitIndex, event] of events.entries()) {
    yield { sourceEventOrdinal: ordinal, splitIndex, origin, event }
  }
}

export function terminal(ordinal: number, origin: EventOrigin, outcome: RunOutcome): SourceEvent {
  return {
    sourceEventOrdinal: ordinal,
    splitIndex: 0,
    origin,
    event: { type: 'response.end', outcome },
  }
}

export function responseOrigin(sequenceNumber: number, payload?: ResponsesPayload): EventOrigin {
  return {
    protocol: 'responses',
    sequenceNumber,
    ...(payload?.item_id || payload?.item?.id
      ? { itemId: payload.item_id ?? payload.item?.id }
      : {}),
    ...(payload?.output_index !== undefined ? { outputIndex: payload.output_index } : {}),
    ...(payload?.content_index !== undefined ? { contentIndex: payload.content_index } : {}),
  }
}

export function partId(payload: ResponsesPayload): string {
  return `${payload.item_id ?? `output:${payload.output_index ?? 0}`}:${payload.content_index ?? 0}`
}

export function failed(message: string, code?: string): RunOutcome {
  return { kind: 'failed', failure: { kind: 'protocol', message, ...(code ? { code } : {}) } }
}

export function isStructuralEvent(type: string): boolean {
  return (
    type.includes('.added') ||
    type.includes('.done') ||
    type === 'response.queued' ||
    type === 'response.in_progress'
  )
}
