import { isAbortError } from './errors'
import {
  failed,
  isStructuralEvent,
  partId,
  responseOrigin,
  terminal,
  wrapEvents,
} from './responses-helpers'
import { parseResponsesPayload, type ResponsesPayload } from './responses-payload'
import { isSseRetryControl, type SseEvent } from './sse'
import type {
  EventOrigin,
  PartDelta,
  PartKind,
  RunOutcome,
  SourceEvent,
  StreamEvent,
} from './types'

interface OpenPart {
  id: string
  origin: EventOrigin
}

export async function* adaptResponses(input: AsyncIterable<SseEvent>): AsyncGenerator<SourceEvent> {
  let ordinal = 0
  let previousSequence: number | undefined
  const openParts = new Map<string, OpenPart>()

  try {
    for await (const sse of input) {
      if (isSseRetryControl(sse)) {
        yield* wrapEvents(ordinal, responseOrigin(previousSequence ?? -1), [
          {
            type: 'diagnostic',
            level: 'info',
            code: 'sse_retry',
            message: `Server requested an SSE retry delay of ${sse.retry}ms`,
          },
        ])
        ordinal += 1
        continue
      }
      const parsed = parseResponsesPayload(sse)
      if ('failure' in parsed) {
        yield terminal(ordinal, responseOrigin(previousSequence ?? -1), parsed.failure)
        return
      }
      const payload = parsed.payload
      const origin = responseOrigin(payload.sequence_number, payload)
      if (previousSequence !== undefined && payload.sequence_number <= previousSequence) {
        yield terminal(
          ordinal,
          origin,
          failed(
            'Responses sequence_number must be strictly increasing',
            'responses_sequence_order',
          ),
        )
        return
      }

      const events: StreamEvent[] = []
      if (previousSequence !== undefined && payload.sequence_number > previousSequence + 1) {
        events.push({
          type: 'diagnostic',
          level: 'warning',
          code: 'responses_sequence_gap',
          message: `Responses sequence jumped from ${previousSequence} to ${payload.sequence_number}`,
        })
      }
      previousSequence = payload.sequence_number
      let terminalOutcome = mapPayload(payload, origin, openParts, events)
      if (terminalOutcome) {
        if (
          (terminalOutcome.kind === 'completed' || terminalOutcome.kind === 'incomplete') &&
          openParts.size > 0
        ) {
          terminalOutcome = failed(
            'Responses terminal arrived before all content parts were done',
            'lifecycle_violation',
          )
        }
        appendOpenPartEnds(events, openParts)
        events.push({ type: 'response.end', outcome: terminalOutcome })
      }
      yield* wrapEvents(ordinal, origin, events)
      if (terminalOutcome) return
      ordinal += 1
    }
  } catch (error) {
    if (isAbortError(error)) throw error
    yield* eofEvents(ordinal, previousSequence, openParts, 'transport')
    return
  }

  yield* eofEvents(ordinal, previousSequence, openParts, 'eof')
}

function mapPayload(
  payload: ResponsesPayload & { type: string; sequence_number: number },
  origin: EventOrigin,
  openParts: Map<string, OpenPart>,
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
  openParts: Map<string, OpenPart>,
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
  openParts: Map<string, OpenPart>,
  origin: EventOrigin,
  id: string,
  kind: PartKind,
): void {
  if (openParts.has(id)) return
  openParts.set(id, { id, origin })
  events.push({ type: 'part.start', partId: id, kind })
}

function endPart(events: StreamEvent[], parts: Map<string, OpenPart>, id: string): void {
  if (!parts.has(id)) return
  events.push({ type: 'part.end', partId: id })
  parts.delete(id)
}

function appendOpenPartEnds(events: StreamEvent[], parts: Map<string, OpenPart>): void {
  for (const part of parts.values()) events.push({ type: 'part.end', partId: part.id })
  parts.clear()
}

function* eofEvents(
  ordinal: number,
  sequence: number | undefined,
  parts: Map<string, OpenPart>,
  cause: 'eof' | 'transport',
): Generator<SourceEvent> {
  const events: StreamEvent[] = []
  appendOpenPartEnds(events, parts)
  events.push({ type: 'response.end', outcome: { kind: 'truncated', cause, retryable: true } })
  yield* wrapEvents(ordinal, responseOrigin(sequence ?? -1), events)
}
