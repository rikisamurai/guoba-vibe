import { appendChatText, appendChatToolCalls, type ChatOpenPart } from './chat-parts'
import { parseChatChunk, type ChatChoice, type ChatChunk } from './chat-payload'
import { isAbortError } from './errors'
import { isSseRetryControl, type SseEvent } from './sse'
import type { RunOutcome, SourceEvent, StreamEvent } from './types'

export async function* adaptChatCompletions(
  input: AsyncIterable<SseEvent>,
): AsyncGenerator<SourceEvent> {
  let ordinal = 0
  let started = false
  const finishReasons = new Map<number, string>()
  const openParts = new Map<string, ChatOpenPart>()
  const toolParts = new Map<string, string>()

  try {
    for await (const sse of input) {
      if (isSseRetryControl(sse)) {
        yield sourceEvent(ordinal, 0, 0, {
          type: 'diagnostic',
          level: 'info',
          code: 'sse_retry',
          message: `Server requested an SSE retry delay of ${sse.retry}ms`,
        })
        ordinal += 1
        continue
      }
      if (sse.data === '[DONE]') {
        yield* terminalEvents(ordinal, openParts, toOutcome(finishReasons))
        return
      }

      let chunk: ChatChunk
      try {
        chunk = parseChatChunk(sse.data)
      } catch (error) {
        yield* terminalEvents(ordinal, openParts, protocolFailure(protocolMessage(error)))
        return
      }
      if (chunk.error) {
        yield* terminalEvents(ordinal, openParts, providerFailure(chunk.error))
        return
      }
      if (!Array.isArray(chunk.choices)) {
        yield* terminalEvents(
          ordinal,
          openParts,
          protocolFailure('Chat chunk must contain a choices array'),
        )
        return
      }
      const lifecycleFailure = validateChoiceLifecycle(chunk.choices, finishReasons)
      if (lifecycleFailure) {
        yield* terminalEvents(ordinal, openParts, protocolFailure(lifecycleFailure))
        return
      }

      const events: SourceEvent[] = []
      if (!started) {
        events.push(
          sourceEvent(ordinal, 0, 0, {
            type: 'response.start',
            responseId: chunk.id ?? 'chat-completions',
          }),
        )
        started = true
      }
      for (const choice of chunk.choices) {
        const choiceIndex = choice.index
        appendChatText(
          events,
          ordinal,
          choiceIndex,
          'reasoning',
          choice.delta?.reasoning_content,
          openParts,
        )
        appendChatText(events, ordinal, choiceIndex, 'answer', choice.delta?.content, openParts)
        appendChatToolCalls(
          events,
          ordinal,
          choiceIndex,
          choice.delta?.tool_calls,
          openParts,
          toolParts,
        )
        if (choice.finish_reason !== undefined && choice.finish_reason !== null) {
          finishReasons.set(choiceIndex, choice.finish_reason)
        }
      }
      for (const [splitIndex, item] of events.entries()) {
        yield { ...item, splitIndex }
      }
      ordinal += 1
    }
  } catch (error) {
    if (isAbortError(error)) throw error
    yield* terminalEvents(ordinal, openParts, {
      kind: 'truncated',
      cause: 'transport',
      retryable: true,
    })
    return
  }

  yield* terminalEvents(ordinal, openParts, {
    kind: 'truncated',
    cause: 'eof',
    retryable: true,
  })
}

function* terminalEvents(
  ordinal: number,
  openParts: Map<string, ChatOpenPart>,
  outcome: RunOutcome,
): Generator<SourceEvent> {
  let splitIndex = 0
  for (const part of openParts.values()) {
    yield sourceEvent(ordinal, splitIndex, part.choiceIndex, {
      type: 'part.end',
      partId: part.id,
    })
    splitIndex += 1
  }
  yield sourceEvent(ordinal, splitIndex, 0, { type: 'response.end', outcome })
}

function providerFailure(error: { code?: string; message: string }): RunOutcome {
  return {
    kind: 'failed',
    failure: {
      kind: 'provider',
      ...(error.code ? { code: error.code } : {}),
      message: error.message,
    },
  }
}

function sourceEvent(
  ordinal: number,
  splitIndex: number,
  choiceIndex: number,
  event: StreamEvent,
): SourceEvent {
  return {
    sourceEventOrdinal: ordinal,
    splitIndex,
    origin: { protocol: 'chat-completions', choiceIndex },
    event,
  }
}

function toOutcome(finishReasons: ReadonlyMap<number, string>): RunOutcome {
  const reasons = [...finishReasons.values()]
  if (reasons.includes('insufficient_system_resource')) {
    return {
      kind: 'failed',
      failure: {
        kind: 'provider',
        code: 'insufficient_system_resource',
        message: 'Generation was interrupted because inference resources were insufficient',
      },
    }
  }
  const incomplete = reasons.find((reason) => reason === 'length' || reason === 'content_filter')
  if (incomplete) return { kind: 'incomplete', reason: incomplete }
  const reason = reasons[0]
  return { kind: 'completed', reason: reason ?? 'done' }
}

function protocolMessage(error: unknown): string {
  return error instanceof Error ? `Invalid Chat JSON: ${error.message}` : 'Invalid Chat JSON'
}

function protocolFailure(message: string): RunOutcome {
  return { kind: 'failed', failure: { kind: 'protocol', message } }
}

function validateChoiceLifecycle(
  choices: ChatChoice[],
  finished: ReadonlyMap<number, string>,
): string | undefined {
  const next = new Map(finished)
  for (const choice of choices) {
    const previous = next.get(choice.index)
    if (previous !== undefined && choice.delta !== undefined) {
      return `Choice ${choice.index} emitted a delta after finish`
    }
    const reason = choice.finish_reason
    if (previous !== undefined && reason !== undefined && reason !== null) {
      const conflict = reason === previous ? 'duplicate' : 'conflicting'
      return `Choice ${choice.index} emitted a ${conflict} finish_reason`
    }
    if (reason !== undefined && reason !== null) next.set(choice.index, reason)
  }
  return undefined
}
