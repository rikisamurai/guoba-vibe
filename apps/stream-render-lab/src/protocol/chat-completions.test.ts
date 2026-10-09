import { describe, expect, it } from 'vitest'

import { adaptChatCompletions } from './chat-completions'
import { sequenceEvents } from './sequence'
import type { SseEvent } from './sse'

async function collect(events: SseEvent[]) {
  const envelopes = []
  for await (const envelope of sequenceEvents(adaptChatCompletions(from(events)))) {
    envelopes.push(envelope)
  }
  return envelopes
}

async function* from<T>(items: T[]): AsyncGenerator<T> {
  yield* items
}

function abortedStream(): AsyncIterable<SseEvent> {
  return {
    [Symbol.asyncIterator]() {
      return {
        next: () => Promise.reject(new DOMException('cancelled', 'AbortError')),
      }
    },
  }
}

describe('adaptChatCompletions', () => {
  it('fans one provider delta into ordered reasoning and answer events', async () => {
    const envelopes = await collect([
      { data: '{"id":"chat-1","choices":[{"index":0,"delta":{"role":"assistant"}}]}' },
      {
        data: '{"id":"chat-1","choices":[{"index":0,"delta":{"reasoning_content":"think","content":"answer"},"finish_reason":null}]}',
      },
      { data: '{"id":"chat-1","choices":[{"index":0,"delta":{},"finish_reason":"stop"}]}' },
      { data: '[DONE]' },
    ])

    expect(envelopes.map(({ internalSeq }) => internalSeq)).toEqual([0, 1, 2, 3, 4, 5, 6, 7])
    expect(
      envelopes
        .slice(1, 5)
        .map(({ sourceEventOrdinal, splitIndex }) => [sourceEventOrdinal, splitIndex]),
    ).toEqual([
      [1, 0],
      [1, 1],
      [1, 2],
      [1, 3],
    ])
    expect(envelopes.map(({ event }) => event)).toEqual([
      { type: 'response.start', responseId: 'chat-1' },
      { type: 'part.start', partId: 'reasoning:0', kind: 'reasoning' },
      { type: 'part.delta', partId: 'reasoning:0', delta: { kind: 'text', text: 'think' } },
      { type: 'part.start', partId: 'answer:0', kind: 'answer' },
      { type: 'part.delta', partId: 'answer:0', delta: { kind: 'text', text: 'answer' } },
      { type: 'part.end', partId: 'reasoning:0' },
      { type: 'part.end', partId: 'answer:0' },
      { type: 'response.end', outcome: { kind: 'completed', reason: 'stop' } },
    ])
  })

  it('maps a proven length stop to incomplete and missing DONE to truncated', async () => {
    const incomplete = await collect([
      {
        data: '{"id":"c","choices":[{"index":0,"delta":{"content":"x"},"finish_reason":"length"}]}',
      },
      { data: '[DONE]' },
    ])
    const truncated = await collect([
      { data: '{"id":"c","choices":[{"index":0,"delta":{"content":"x"},"finish_reason":"stop"}]}' },
    ])

    expect(incomplete.at(-1)?.event).toEqual({
      type: 'response.end',
      outcome: { kind: 'incomplete', reason: 'length' },
    })
    expect(truncated.at(-1)?.event).toEqual({
      type: 'response.end',
      outcome: { kind: 'truncated', cause: 'eof', retryable: true },
    })
  })

  it('maps an inference resource interruption to provider failure', async () => {
    const envelopes = await collect([
      {
        data: '{"id":"c","choices":[{"index":0,"delta":{"content":"partial"},"finish_reason":"insufficient_system_resource"}]}',
      },
      { data: '[DONE]' },
    ])

    expect(envelopes.at(-1)?.event).toEqual({
      type: 'response.end',
      outcome: {
        kind: 'failed',
        failure: {
          kind: 'provider',
          code: 'insufficient_system_resource',
          message: 'Generation was interrupted because inference resources were insufficient',
        },
      },
    })
  })

  it('does not let a later choice hide an incomplete terminal reason', async () => {
    const envelopes = await collect([
      {
        data: '{"id":"c","choices":[{"index":0,"delta":{"content":"cut"},"finish_reason":"length"},{"index":1,"delta":{"content":"done"},"finish_reason":"stop"}]}',
      },
      { data: '[DONE]' },
    ])

    expect(envelopes.at(-1)?.event).toEqual({
      type: 'response.end',
      outcome: { kind: 'incomplete', reason: 'length' },
    })
  })

  it('keeps provider failure more severe than another choice incomplete', async () => {
    const envelopes = await collect([
      {
        data: '{"id":"c","choices":[{"index":0,"delta":{},"finish_reason":"length"},{"index":1,"delta":{},"finish_reason":"insufficient_system_resource"}]}',
      },
      { data: '[DONE]' },
    ])

    expect(envelopes.at(-1)?.event).toMatchObject({
      type: 'response.end',
      outcome: {
        kind: 'failed',
        failure: { kind: 'provider', code: 'insufficient_system_resource' },
      },
    })
  })

  it('maps malformed known payloads to failed instead of truncation', async () => {
    const envelopes = await collect([{ data: '{not json}' }])

    expect(envelopes).toHaveLength(1)
    expect(envelopes[0]?.event).toMatchObject({
      type: 'response.end',
      outcome: { kind: 'failed', failure: { kind: 'protocol' } },
    })
  })

  it.each([
    ['missing', '{}'],
    ['negative', '{"index":-1}'],
    ['fractional', '{"index":1.5}'],
  ])('rejects a %s choice index as malformed protocol data', async (_name, choice) => {
    const envelopes = await collect([
      { data: `{"id":"c","choices":[${choice}]}` },
      { data: '[DONE]' },
    ])

    expect(envelopes.at(-1)?.event).toMatchObject({
      type: 'response.end',
      outcome: { kind: 'failed', failure: { kind: 'protocol' } },
    })
  })

  it('closes accepted parts before a later malformed index fails the stream', async () => {
    const envelopes = await collect([
      { data: '{"id":"c","choices":[{"index":0,"delta":{"content":"kept"}}]}' },
      { data: '{"id":"c","choices":[{"delta":{"content":"invalid"}}]}' },
    ])

    expect(envelopes.slice(-2).map(({ event }) => event)).toEqual([
      { type: 'part.end', partId: 'answer:0' },
      {
        type: 'response.end',
        outcome: {
          kind: 'failed',
          failure: {
            kind: 'protocol',
            message: 'Invalid Chat JSON: choice index must be a nonnegative integer',
          },
        },
      },
    ])
  })

  it('fails before accepting a delta emitted after that choice finished', async () => {
    const envelopes = await collect([
      {
        data: '{"id":"c","choices":[{"index":0,"delta":{"content":"kept"},"finish_reason":"stop"}]}',
      },
      {
        data: '{"id":"c","choices":[{"index":0,"delta":{"content":"late"},"finish_reason":null}]}',
      },
      { data: '[DONE]' },
    ])

    const texts = envelopes.flatMap(({ event }) =>
      event.type === 'part.delta' && event.delta.kind === 'text' ? [event.delta.text] : [],
    )
    expect(texts).toEqual(['kept'])
    expect(envelopes.at(-1)?.event).toMatchObject({
      type: 'response.end',
      outcome: { kind: 'failed', failure: { kind: 'protocol' } },
    })
  })

  it.each(['stop', 'length'])(
    'rejects a second %s finish for an already-finished choice',
    async (secondReason) => {
      const envelopes = await collect([
        {
          data: '{"id":"c","choices":[{"index":0,"delta":{},"finish_reason":"stop"}]}',
        },
        {
          data: `{"id":"c","choices":[{"index":0,"finish_reason":"${secondReason}"}]}`,
        },
        { data: '[DONE]' },
      ])

      expect(envelopes.at(-1)?.event).toMatchObject({
        type: 'response.end',
        outcome: { kind: 'failed', failure: { kind: 'protocol' } },
      })
    },
  )

  it('rejects a same-chunk duplicate without emitting orphan part events', async () => {
    const envelopes = await collect([
      {
        data: '{"id":"c","choices":[{"index":0,"delta":{"content":"discarded"},"finish_reason":"stop"},{"index":0,"finish_reason":"stop"}]}',
      },
    ])

    expect(envelopes.map(({ event }) => event)).toEqual([
      {
        type: 'response.end',
        outcome: {
          kind: 'failed',
          failure: {
            kind: 'protocol',
            message: 'Choice 0 emitted a duplicate finish_reason',
          },
        },
      },
    ])
  })

  it('lets cancellation aborts reach the engine instead of relabeling them', async () => {
    const collectAborted = async () => {
      for await (const event of adaptChatCompletions(abortedStream())) {
        throw new Error(`Unexpected event before abort: ${event.event.type}`)
      }
    }

    await expect(collectAborted()).rejects.toMatchObject({ name: 'AbortError' })
  })

  it('keeps an upstream error distinct from malformed protocol data', async () => {
    const envelopes = await collect([
      {
        data: '{"error":{"type":"rate_limit","code":"429","message":"slow down"}}',
      },
    ])

    expect(envelopes[0]?.event).toEqual({
      type: 'response.end',
      outcome: {
        kind: 'failed',
        failure: { kind: 'provider', code: '429', message: 'slow down' },
      },
    })
  })
})
