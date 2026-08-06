import type { ResponsesPayload } from './responses-payload'
import type {
  EventOrigin,
  PartDelta,
  PartKind,
  RunOutcome,
  SourceEvent,
  StreamEvent,
} from './types'

export interface OpenResponsePart {
  id: string
  origin: EventOrigin
}

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

export function mapResponsePayload(
  payload: ResponsesPayload & { type: string; sequence_number: number },
  origin: EventOrigin,
  openParts: Map<string, OpenResponsePart>,
  events: StreamEvent[],
): RunOutcome | undefined {
  if (payload.type === 'response.created') {
    events.push({ type: 'response.start', responseId: payload.response?.id ?? 'response' })
  } else if (
    payload.type === 'response.output_item.added' &&
    payload.item?.type === 'function_call'
  ) {
    startPart(events, openParts, origin, payload.item.id ?? 'tool:0', 'tool-call')
  } else if (payload.type === 'response.output_text.delta') {
    appendDelta(events, openParts, origin, partId(payload), 'answer', {
      kind: 'text',
      text: payload.delta ?? '',
    })
  } else if (
    payload.type === 'response.reasoning_text.delta' ||
    payload.type === 'response.reasoning_summary_text.delta'
  ) {
    appendDelta(events, openParts, origin, partId(payload), 'reasoning', {
      kind: 'text',
      text: payload.delta ?? '',
    })
  } else if (payload.type === 'response.function_call_arguments.delta') {
    appendDelta(events, openParts, origin, payload.item_id ?? 'tool:0', 'tool-call', {
      kind: 'json',
      fragment: payload.delta ?? '',
    })
  } else if (payload.type === 'response.output_item.done') {
    endPart(events, openParts, payload.item?.id ?? payload.item_id ?? partId(payload))
  } else if (payload.type.endsWith('.done')) {
    endPart(events, openParts, partId(payload))
  } else if (payload.type === 'response.completed') {
    return { kind: 'completed', reason: 'completed' }
  } else if (payload.type === 'response.incomplete') {
    return {
      kind: 'incomplete',
      reason: payload.response?.incomplete_details?.reason ?? 'incomplete',
    }
  } else if (payload.type === 'response.failed' || payload.type === 'error') {
    const error = payload.response?.error ?? payload.error
    return {
      kind: 'failed',
      failure: {
        kind: 'provider',
        ...(error?.code ? { code: error.code } : {}),
        message: error?.message ?? 'Responses provider failed',
      },
    }
  } else if (!isStructuralEvent(payload.type)) {
    events.push({
      type: 'diagnostic',
      level: 'info',
      code: 'responses_unknown_event',
      message: `Ignored Responses event: ${payload.type}`,
    })
  }
  return undefined
}

function appendDelta(
  events: StreamEvent[],
  openParts: Map<string, OpenResponsePart>,
  origin: EventOrigin,
  id: string,
  kind: PartKind,
  delta: PartDelta,
): void {
  startPart(events, openParts, origin, id, kind)
  events.push({ type: 'part.delta', partId: id, delta })
}

function startPart(
  events: StreamEvent[],
  openParts: Map<string, OpenResponsePart>,
  origin: EventOrigin,
  id: string,
  kind: PartKind,
): void {
  if (openParts.has(id)) return
  openParts.set(id, { id, origin })
  events.push({ type: 'part.start', partId: id, kind })
}

function endPart(events: StreamEvent[], parts: Map<string, OpenResponsePart>, id: string): void {
  if (!parts.has(id)) return
  events.push({ type: 'part.end', partId: id })
  parts.delete(id)
}

export function appendOpenPartEnds(
  events: StreamEvent[],
  parts: Map<string, OpenResponsePart>,
): void {
  for (const part of parts.values()) events.push({ type: 'part.end', partId: part.id })
  parts.clear()
}
