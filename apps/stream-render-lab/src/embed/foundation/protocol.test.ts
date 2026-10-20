import { describe, expect, it } from 'vitest'

import { adaptChatCompletions, CHAT_COMPLETIONS_FIXTURE_CHUNKS } from './chat-completions'
import { parseEventStream, SSE_FIXTURE_CHUNKS } from './sse'
import { decodeUtf8Chunks, UTF8_FIXTURE_CHUNKS, UTF8_FIXTURE_TEXT } from './utf8'

describe('embedded demo protocol references', () => {
  it('decodes UTF-8 across arbitrary byte splits', () => {
    expect(decodeUtf8Chunks(UTF8_FIXTURE_CHUNKS)).toBe(UTF8_FIXTURE_TEXT)
  })
  it('parses WHATWG SSE fields and drops EOF residue', () => {
    expect(parseEventStream(SSE_FIXTURE_CHUNKS)).toEqual({
      events: [
        { type: 'token', data: '{"text":"你"}\n{"text":"好"}', lastEventId: '7' },
        { type: 'message', data: 'plain', lastEventId: '7' },
      ],
      lastEventId: '7',
      retryMs: 1500,
    })
  })
  it('maps Chat Completions deltas into demo events', () => {
    const parsed = parseEventStream(CHAT_COMPLETIONS_FIXTURE_CHUNKS)
    expect(adaptChatCompletions(parsed.events)).toEqual([
      { kind: 'reasoning-delta', text: '先想' },
      { kind: 'content-delta', text: '再答' },
      { kind: 'finish', reason: 'stop' },
      { kind: 'done' },
    ])
  })
})
