import { describe, expect, it } from 'vitest'

import { adaptResponses } from './responses'
import { sequenceEvents } from './sequence'
import type { SseEvent } from './sse'

async function collect(events: SseEvent[]) {
  const envelopes = []
  for await (const envelope of sequenceEvents(adaptResponses(from(events)))) {
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

describe('adaptResponses', () => {
  it('keeps provider sequence numbers separate from internal ordering', async () => {
    const envelopes = await collect([
      event('response.created', { sequence_number: 10, response: { id: 'resp-1' } }),
      event('response.output_text.delta', {
        sequence_number: 11,
        item_id: 'msg-1',
        output_index: 0,
        content_index: 0,
        delta: 'hello',
      }),
      event('response.output_text.done', {
        sequence_number: 12,
        item_id: 'msg-1',
        output_index: 0,
        content_index: 0,
      }),
      event('response.completed', { sequence_number: 13, response: { id: 'resp-1' } }),
    ])

    expect(envelopes.map(({ internalSeq }) => internalSeq)).toEqual([0, 1, 2, 3, 4])
    expect(
      envelopes.map(({ origin }) => (origin.protocol === 'responses' ? origin.sequenceNumber : -1)),
    ).toEqual([10, 11, 11, 12, 13])
    expect(envelopes.map(({ event: item }) => item)).toEqual([
      { type: 'response.start', responseId: 'resp-1' },
      { type: 'part.start', partId: 'msg-1:0', kind: 'answer' },
      { type: 'part.delta', partId: 'msg-1:0', delta: { kind: 'text', text: 'hello' } },
      { type: 'part.end', partId: 'msg-1:0' },
      { type: 'response.end', outcome: { kind: 'completed', reason: 'completed' } },
    ])
  })

  it('reports gaps but fails a duplicate or decreasing provider cursor', async () => {
    const envelopes = await collect([
      event('response.created', { sequence_number: 1, response: { id: 'r' } }),
      event('response.output_text.delta', {
        sequence_number: 3,
        item_id: 'm',
        content_index: 0,
        delta: 'x',
      }),
      event('response.output_text.delta', {
        sequence_number: 3,
        item_id: 'm',
        content_index: 0,
        delta: 'y',
      }),
    ])

    expect(
      envelopes.some(
        ({ event: item }) => item.type === 'diagnostic' && item.code === 'responses_sequence_gap',
      ),
    ).toBe(true)
    expect(envelopes.at(-1)?.event).toMatchObject({
      type: 'response.end',
      outcome: { kind: 'failed', failure: { code: 'responses_sequence_order' } },
    })
  })

  it('distinguishes explicit incomplete, provider failed, and transport EOF', async () => {
    const incomplete = await collect([
      event('response.incomplete', {
        sequence_number: 1,
        response: { incomplete_details: { reason: 'max_output_tokens' } },
      }),
    ])
    const failed = await collect([
      event('response.failed', {
        sequence_number: 1,
        response: { error: { code: 'server_error', message: 'upstream failed' } },
      }),
    ])
    const truncated = await collect([
      event('response.created', { sequence_number: 1, response: { id: 'r' } }),
    ])

    expect(incomplete.at(-1)?.event).toEqual({
      type: 'response.end',
      outcome: { kind: 'incomplete', reason: 'max_output_tokens' },
    })
    expect(failed.at(-1)?.event).toEqual({
      type: 'response.end',
      outcome: {
        kind: 'failed',
        failure: { kind: 'provider', code: 'server_error', message: 'upstream failed' },
      },
    })
    expect(truncated.at(-1)?.event).toEqual({
      type: 'response.end',
      outcome: { kind: 'truncated', cause: 'eof', retryable: true },
    })
  })

  it('keeps function-call arguments as JSON fragments and closes by item id', async () => {
    const envelopes = await collect([
      event('response.created', { sequence_number: 0, response: { id: 'r' } }),
      event('response.output_item.added', {
        sequence_number: 1,
        output_index: 0,
        item: { id: 'call-1', type: 'function_call' },
      }),
      event('response.function_call_arguments.delta', {
        sequence_number: 2,
        output_index: 0,
        item_id: 'call-1',
        delta: '{"city":"Paris"}',
      }),
      event('response.output_item.done', {
        sequence_number: 3,
        output_index: 0,
        item: { id: 'call-1', type: 'function_call' },
      }),
      event('response.completed', { sequence_number: 4, response: { id: 'r' } }),
    ])

    const toolEvents = envelopes.filter(
      ({ event: item }) =>
        item.type === 'part.start' || item.type === 'part.delta' || item.type === 'part.end',
    )
    expect(
      toolEvents.map(({ origin, event: item }) => ({
        sequence: origin.protocol === 'responses' ? origin.sequenceNumber : -1,
        event: item,
      })),
    ).toEqual([
      {
        sequence: 1,
        event: { type: 'part.start', partId: 'call-1', kind: 'tool-call' },
      },
      {
        sequence: 2,
        event: {
          type: 'part.delta',
          partId: 'call-1',
          delta: { kind: 'json', fragment: '{"city":"Paris"}' },
        },
      },
      { sequence: 3, event: { type: 'part.end', partId: 'call-1' } },
    ])
  })

  it('fails completion while a content part is still open', async () => {
    const envelopes = await collect([
      event('response.created', { sequence_number: 0, response: { id: 'r' } }),
      event('response.output_text.delta', {
        sequence_number: 1,
        item_id: 'message',
        content_index: 0,
        delta: 'partial',
      }),
      event('response.completed', { sequence_number: 2, response: { id: 'r' } }),
    ])

    expect(envelopes.at(-1)?.event).toMatchObject({
      type: 'response.end',
      outcome: { kind: 'failed', failure: { kind: 'protocol', code: 'lifecycle_violation' } },
    })
  })
})
