import {
  appendDelta,
  appendOpenBlockEnds,
  startBlock,
  stopBlock,
  type AnthropicPayload,
  type OpenBlock,
} from './anthropic-blocks'
import { anthropicProtocolFailure, parseAnthropicPayload } from './anthropic-payload'
import { isAbortError } from './errors'
import { isSseRetryControl, type SseEvent } from './sse'
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
      const parsed = parseAnthropicPayload(sse)
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
            ? anthropicProtocolFailure('message_stop arrived before content_block_stop')
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
