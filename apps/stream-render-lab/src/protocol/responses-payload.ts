import { numberField, objectField, parseJsonObject, stringField, type JsonObject } from './json'
import type { SseMessageEvent } from './sse'
import type { RunOutcome } from './types'

export interface ResponsesPayload {
  type: string
  sequence_number: number
  item_id?: string
  output_index?: number
  content_index?: number
  delta?: string
  item?: { id?: string; type?: string }
  response?: {
    id?: string
    incomplete_details?: { reason?: string }
    error?: { code?: string; message?: string }
  }
  error?: { code?: string; message?: string }
}

export function parseResponsesPayload(
  sse: SseMessageEvent,
): { payload: ResponsesPayload } | { failure: RunOutcome } {
  try {
    const raw = parseJsonObject(sse.data)
    const type = stringField(raw, 'type') ?? sse.event
    const sequenceNumber = numberField(raw, 'sequence_number')
    if (!type || sequenceNumber === undefined) {
      return { failure: failed('Responses event needs type and sequence_number') }
    }
    return { payload: buildPayload(raw, type, sequenceNumber) }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'unknown JSON error'
    return { failure: failed(`Invalid Responses JSON: ${message}`) }
  }
}

function buildPayload(raw: JsonObject, type: string, sequenceNumber: number): ResponsesPayload {
  const response = objectField(raw, 'response')
  const incomplete = response && objectField(response, 'incomplete_details')
  const responseError = response && objectField(response, 'error')
  const eventError = objectField(raw, 'error')
  const item = objectField(raw, 'item')
  return {
    type,
    sequence_number: sequenceNumber,
    item_id: stringField(raw, 'item_id'),
    output_index: numberField(raw, 'output_index'),
    content_index: numberField(raw, 'content_index'),
    delta: stringField(raw, 'delta'),
    ...(item
      ? {
          item: { id: stringField(item, 'id'), type: stringField(item, 'type') },
        }
      : {}),
    ...(response
      ? {
          response: {
            id: stringField(response, 'id'),
            ...(incomplete
              ? {
                  incomplete_details: { reason: stringField(incomplete, 'reason') },
                }
              : {}),
            ...(responseError ? { error: readError(responseError) } : {}),
          },
        }
      : {}),
    ...(eventError ? { error: readError(eventError) } : {}),
  }
}

function readError(error: JsonObject): { code?: string; message?: string } {
  return { code: stringField(error, 'code'), message: stringField(error, 'message') }
}

function failed(message: string): RunOutcome {
  return { kind: 'failed', failure: { kind: 'protocol', message } }
}
