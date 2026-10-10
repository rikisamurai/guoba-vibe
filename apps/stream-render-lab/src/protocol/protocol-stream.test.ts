import { describe, expect, it } from 'vitest'

import anthropicWire from './fixtures/anthropic.sse?raw'
import chatWire from './fixtures/chat-completions.sse?raw'
import responsesWire from './fixtures/responses.sse?raw'
import { adaptProtocolStream, type WireProtocol } from './protocol-stream'

const wires: Record<WireProtocol, string> = {
  'chat-completions': chatWire,
  responses: responsesWire,
  anthropic: anthropicWire,
}

const cases: Array<[WireProtocol, string]> = [
  ['chat-completions', wires['chat-completions']],
  ['responses', wires.responses],
  ['anthropic', wires.anthropic],
]

describe('adaptProtocolStream', () => {
  it.each(cases)(
    'composes byte decoding, SSE parsing, and the %s adapter',
    async (protocol, wire) => {
      const bytes = new TextEncoder().encode(wire)
      const chunks = Array.from(bytes, (byte) => Uint8Array.of(byte))
      const events = []

      for await (const item of adaptProtocolStream(protocol, from(chunks))) {
        events.push(item.event)
      }

      expect(events[0]?.type).toBe('response.start')
      expect(events.at(-1)).toMatchObject({
        type: 'response.end',
        outcome: { kind: 'completed' },
      })
    },
  )

  it('accepts response.in_progress as a structural no-op', async () => {
    const events = []

    for await (const item of adaptProtocolStream(
      'responses',
      from([new TextEncoder().encode(responsesWire)]),
    )) {
      events.push(item.event)
    }

    expect(events).toEqual([
      { type: 'response.start', responseId: 'resp_fixture' },
      { type: 'part.start', partId: 'msg_fixture:0', kind: 'answer' },
      {
        type: 'part.delta',
        partId: 'msg_fixture:0',
        delta: { kind: 'text', text: 'hello' },
      },
      { type: 'part.end', partId: 'msg_fixture:0' },
      { type: 'response.end', outcome: { kind: 'completed', reason: 'completed' } },
    ])
  })

  it('accumulates Chat tool call argument fragments under one stable part', async () => {
    const events = []

    for await (const item of adaptProtocolStream(
      'chat-completions',
      from([new TextEncoder().encode(chatWire)]),
    )) {
      events.push(item.event)
    }

    expect(events).toEqual([
      { type: 'response.start', responseId: 'chat_fixture' },
      { type: 'part.start', partId: 'call_weather', kind: 'tool-call' },
      {
        type: 'part.delta',
        partId: 'call_weather',
        delta: { kind: 'json', fragment: '{"city"' },
      },
      {
        type: 'part.delta',
        partId: 'call_weather',
        delta: { kind: 'json', fragment: ':"Paris"}' },
      },
      { type: 'part.end', partId: 'call_weather' },
      { type: 'response.end', outcome: { kind: 'completed', reason: 'tool_calls' } },
    ])
  })

  it('keeps retry controls observable through the provider adapter', async () => {
    const bytes = new TextEncoder().encode(`retry: 1800\n\n${responsesWire}`)
    const events = []

    for await (const item of adaptProtocolStream('responses', from([bytes]))) {
      events.push(item.event)
    }

    expect(events[0]).toEqual({
      type: 'diagnostic',
      level: 'info',
      code: 'sse_retry',
      message: 'Server requested an SSE retry delay of 1800ms',
    })
    expect(events.at(-1)).toMatchObject({
      type: 'response.end',
      outcome: { kind: 'completed' },
    })
  })
})

async function* from<T>(items: T[]): AsyncGenerator<T> {
  yield* items
}
