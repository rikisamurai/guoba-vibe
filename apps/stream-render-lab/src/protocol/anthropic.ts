import {
  appendDelta,
  appendOpenBlockEnds,
  startBlock,
  stopBlock,
  type AnthropicPayload,
  type OpenBlock,
} from './anthropic-blocks'
import { isAbortError } from './errors'
import { numberField, objectField, parseJsonObject, stringField, type JsonObject } from './json'
import { isSseRetryControl, type SseEvent, type SseMessageEvent } from './sse'
import type { EventOrigin, RunOutcome, SourceEvent, StreamEvent } from './types'

export async function* adaptAnthropicMessages(
  input: AsyncIterable<SseEvent>,
): AsyncGenerator<SourceEvent> {
  let ordinal = 0
  let stopReason: string | undefined
  const openBlocks = new Map<number, OpenBlock>()

  try {
    for await (const sse of input) {
      if (isSseRetryControl(sse)) {
        yield sourceEvent(ordinal, 0, undefined, {
          type: 'diagnostic',
          level: 'info',
          code: 'sse_retry',
          message: `Server requested an SSE retry delay of ${sse.retry}ms`,
        })
        ordinal += 1
        continue
      }
      const parsed = parsePayload(sse)
      if ('outcome' in parsed) {
        yield sourceEvent(ordinal, 0, undefined, {
          type: 'response.end',
          outcome: parsed.outcome,
        })
        return
      }
      const payload = parsed.payload
      const originIndex = payload.index
      const events: StreamEvent[] = []

      if (payload.type === 'message_start') {
        events.push({ type: 'response.start', responseId: payload.message?.id ?? 'message' })
      } else if (payload.type === 'content_block_start') {
        const failure = startBlock(payload, openBlocks, events)
        if (failure) {
          yield sourceEvent(ordinal, 0, originIndex, { type: 'response.end', outcome: failure })
          return
        }
      } else if (payload.type === 'content_block_delta') {
        const failure = appendDelta(payload, openBlocks, events)
        if (failure) {
          yield sourceEvent(ordinal, 0, originIndex, { type: 'response.end', outcome: failure })
          return
        }
      } else if (payload.type === 'content_block_stop') {
        const failure = stopBlock(payload, openBlocks, events)
        if (failure) {
          yield sourceEvent(ordinal, 0, originIndex, { type: 'response.end', outcome: failure })
          return
        }
      } else if (payload.type === 'message_delta') {
        if (payload.delta?.stop_reason) stopReason = payload.delta.stop_reason
      } else if (payload.type === 'message_stop') {
        const outcome =
          openBlocks.size > 0
            ? protocolFailure('message_stop arrived before content_block_stop')
            : toOutcome(stopReason)
        appendOpenBlockEnds(openBlocks, events)
        events.push({ type: 'response.end', outcome })
      } else if (payload.type === 'error') {
        events.push({ type: 'response.end', outcome: providerFailure(payload) })
      } else if (payload.type !== 'ping') {
        events.push({
          type: 'diagnostic',
          level: 'info',
          code: 'anthropic_unknown_event',
          message: `Ignored Anthropic event: ${payload.type}`,
        })
      }

      yield* wrapEvents(ordinal, originIndex, events)
      if (payload.type === 'message_stop' || payload.type === 'error') return
      ordinal += 1
    }
  } catch (error) {
    if (isAbortError(error)) throw error
    yield* truncatedEvents(ordinal, openBlocks, 'transport')
    return
  }

  yield* truncatedEvents(ordinal, openBlocks, 'eof')
}

function parsePayload(
  sse: SseMessageEvent,
): { payload: AnthropicPayload & { type: string } } | { outcome: RunOutcome } {
  try {
    const raw = parseJsonObject(sse.data)
    const type = stringField(raw, 'type') ?? sse.event
    if (!type) return { outcome: protocolFailure('Anthropic event needs a type') }
    return { payload: buildPayload(raw, type) }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'unknown JSON error'
    return { outcome: protocolFailure(`Invalid Anthropic JSON: ${message}`) }
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

function* truncatedEvents(
  ordinal: number,
  blocks: Map<number, OpenBlock>,
  cause: 'eof' | 'transport',
): Generator<SourceEvent> {
  const events: StreamEvent[] = []
  appendOpenBlockEnds(blocks, events)
  events.push({ type: 'response.end', outcome: { kind: 'truncated', cause, retryable: true } })
  yield* wrapEvents(ordinal, undefined, events)
}

function* wrapEvents(
  ordinal: number,
  blockIndex: number | undefined,
  events: StreamEvent[],
): Generator<SourceEvent> {
  for (const [splitIndex, event] of events.entries()) {
    yield sourceEvent(ordinal, splitIndex, blockIndex, event)
  }
}

function sourceEvent(
  ordinal: number,
  splitIndex: number,
  blockIndex: number | undefined,
  event: StreamEvent,
): SourceEvent {
  const origin: EventOrigin =
    blockIndex === undefined ? { protocol: 'anthropic' } : { protocol: 'anthropic', blockIndex }
  return { sourceEventOrdinal: ordinal, splitIndex, origin, event }
}

function toOutcome(reason: string | undefined): RunOutcome {
  if (reason === 'max_tokens' || reason === 'model_context_window_exceeded') {
    return { kind: 'incomplete', reason }
  }
  return { kind: 'completed', reason: reason ?? 'message_stop' }
}

function providerFailure(payload: AnthropicPayload): RunOutcome {
  return {
    kind: 'failed',
    failure: {
      kind: 'provider',
      ...(payload.error?.type ? { code: payload.error.type } : {}),
      message: payload.error?.message ?? 'Anthropic provider failed',
    },
  }
}

function protocolFailure(message: string): RunOutcome {
  return { kind: 'failed', failure: { kind: 'protocol', message } }
}
