import type { AnthropicPayload } from './anthropic-blocks'
import { numberField, objectField, parseJsonObject, stringField, type JsonObject } from './json'
import type { SseMessageEvent } from './sse'
import type { RunOutcome } from './types'

export function parseAnthropicPayload(
  sse: SseMessageEvent,
): { payload: AnthropicPayload & { type: string } } | { outcome: RunOutcome } {
  try {
    const raw = parseJsonObject(sse.data)
    const type = stringField(raw, 'type') ?? sse.event
    if (!type) return { outcome: anthropicProtocolFailure('Anthropic event needs a type') }
    return { payload: buildPayload(raw, type) }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'unknown JSON error'
    return { outcome: anthropicProtocolFailure(`Invalid Anthropic JSON: ${message}`) }
  }
}

function buildPayload(raw: JsonObject, type: string): AnthropicPayload & { type: string } {
  const message = objectField(raw, 'message')
  const block = objectField(raw, 'content_block')
  const delta = objectField(raw, 'delta')
  const error = objectField(raw, 'error')
  return {
    type,
    index: numberField(raw, 'index'),
    ...(message ? { message: { id: stringField(message, 'id') } } : {}),
    ...(block
      ? {
          content_block: {
            type: stringField(block, 'type'),
            id: stringField(block, 'id'),
            ...('input' in block ? { input: block.input } : {}),
          },
        }
      : {}),
    ...(delta
      ? {
          delta: {
            type: stringField(delta, 'type'),
            text: stringField(delta, 'text'),
            thinking: stringField(delta, 'thinking'),
            partial_json: stringField(delta, 'partial_json'),
            stop_reason: nullableString(delta.stop_reason),
          },
        }
      : {}),
    ...(error
      ? {
          error: { type: stringField(error, 'type'), message: stringField(error, 'message') },
        }
      : {}),
  }
}

function nullableString(value: unknown): string | null | undefined {
  if (value === null || typeof value === 'string') return value
  return undefined
}

export function anthropicProtocolFailure(message: string): RunOutcome {
  return { kind: 'failed', failure: { kind: 'protocol', message } }
}
