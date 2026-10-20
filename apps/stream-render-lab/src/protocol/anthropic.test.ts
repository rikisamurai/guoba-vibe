import { describe, expect, it } from 'vitest'

import { adaptAnthropicMessages } from './anthropic'
import { sequenceEvents } from './sequence'
import type { SseEvent } from './sse'

async function collect(events: SseEvent[]) {
  const envelopes = []
  for await (const envelope of sequenceEvents(adaptAnthropicMessages(from(events)))) {
    envelopes.push(envelope)
  }
  return envelopes
}

async function* from<T>(items: T[]): AsyncGenerator<T> {
  yield* items
}

const event = (type: string, body: Record<string, unknown>): SseEvent => ({
  event: type,
  data: JSON.stringify({ type, ...body }),
})

describe('adaptAnthropicMessages', () => {
  it('uses block indexes as addresses and maps max_tokens to incomplete', async () => {
    const envelopes = await collect([
      event('message_start', { message: { id: 'msg-1' } }),
      event('content_block_start', { index: 2, content_block: { type: 'text' } }),
      event('content_block_delta', { index: 2, delta: { type: 'text_delta', text: 'hi' } }),
      event('content_block_stop', { index: 2 }),
      event('message_delta', { delta: { stop_reason: 'max_tokens' } }),
      event('message_stop', {}),
    ])

    expect(envelopes.map(({ internalSeq }) => internalSeq)).toEqual([0, 1, 2, 3, 4])
    expect(envelopes[2]?.origin).toEqual({ protocol: 'anthropic', blockIndex: 2 })
    expect(envelopes.map(({ event: item }) => item)).toEqual([
      { type: 'response.start', responseId: 'msg-1' },
      { type: 'part.start', partId: 'block:2', kind: 'answer' },
      { type: 'part.delta', partId: 'block:2', delta: { kind: 'text', text: 'hi' } },
      { type: 'part.end', partId: 'block:2' },
      { type: 'response.end', outcome: { kind: 'incomplete', reason: 'max_tokens' } },
    ])
  })

  it('keeps tool input as JSON fragments until the block closes', async () => {
    const envelopes = await collect([
      event('content_block_start', {
        index: 0,
        content_block: { type: 'tool_use', id: 'tool-1' },
      }),
      event('content_block_delta', {
        index: 0,
        delta: { type: 'input_json_delta', partial_json: '{"city"' },
      }),
      event('content_block_delta', {
        index: 0,
        delta: { type: 'input_json_delta', partial_json: ':"Paris"}' },
      }),
      event('content_block_stop', { index: 0 }),
      event('message_delta', { delta: { stop_reason: 'tool_use' } }),
      event('message_stop', {}),
    ])

    expect(envelopes.map(({ event: item }) => item)).toContainEqual({
      type: 'part.delta',
      partId: 'tool-1',
      delta: { kind: 'json', fragment: '{"city"' },
    })
    expect(envelopes.at(-1)?.event).toEqual({
      type: 'response.end',
      outcome: { kind: 'completed', reason: 'tool_use' },
    })
  })

  it('fails a tool block whose partial JSON is still malformed at block stop', async () => {
    const envelopes = await collect([
      event('content_block_start', {
        index: 0,
        content_block: { type: 'tool_use', id: 'tool-1', input: {} },
      }),
      event('content_block_delta', {
        index: 0,
        delta: { type: 'input_json_delta', partial_json: '{"city"' },
      }),
      event('content_block_stop', { index: 0 }),
    ])

    expect(envelopes.at(-1)?.event).toEqual({
      type: 'response.end',
      outcome: {
        kind: 'failed',
        failure: { kind: 'protocol', message: 'Tool input is not valid JSON at block stop' },
      },
    })
  })

  it('distinguishes provider errors and missing message_stop truncation', async () => {
    const failed = await collect([
      event('error', { error: { type: 'overloaded_error', message: 'busy' } }),
    ])
    const truncated = await collect([event('message_start', { message: { id: 'm' } })])

    expect(failed.at(-1)?.event).toEqual({
      type: 'response.end',
      outcome: {
        kind: 'failed',
        failure: { kind: 'provider', code: 'overloaded_error', message: 'busy' },
      },
    })
    expect(truncated.at(-1)?.event).toEqual({
      type: 'response.end',
      outcome: { kind: 'truncated', cause: 'eof', retryable: true },
    })
  })

  it('fails message_stop while a content block is still open', async () => {
    const envelopes = await collect([
      event('message_start', { message: { id: 'm' } }),
      event('content_block_start', { index: 0, content_block: { type: 'text' } }),
      event('content_block_delta', { index: 0, delta: { type: 'text_delta', text: 'partial' } }),
      event('message_stop', {}),
    ])

    expect(envelopes.at(-1)?.event).toMatchObject({
      type: 'response.end',
      outcome: { kind: 'failed', failure: { kind: 'protocol' } },
    })
  })
})
