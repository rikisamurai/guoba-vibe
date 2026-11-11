import { isAbortError } from './errors'
import {
  appendOpenPartEnds,
  failed,
  mapResponsePayload,
  responseOrigin,
  terminal,
  type OpenResponsePart,
  wrapEvents,
} from './responses-helpers'
import { parseResponsesPayload } from './responses-payload'
import { isSseRetryControl, type SseEvent } from './sse'
import type { SourceEvent, StreamEvent } from './types'

export async function* adaptResponses(input: AsyncIterable<SseEvent>): AsyncGenerator<SourceEvent> {
  let ordinal = 0
  let previousSequence: number | undefined
  const openParts = new Map<string, OpenResponsePart>()

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
      let terminalOutcome = mapResponsePayload(payload, origin, openParts, events)
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

function* eofEvents(
  ordinal: number,
  sequence: number | undefined,
  parts: Map<string, OpenResponsePart>,
  cause: 'eof' | 'transport',
): Generator<SourceEvent> {
  const events: StreamEvent[] = []
  appendOpenPartEnds(events, parts)
  events.push({ type: 'response.end', outcome: { kind: 'truncated', cause, retryable: true } })
  yield* wrapEvents(ordinal, responseOrigin(sequence ?? -1), events)
}
