import { expect, it } from 'vitest'

import { defineStep04Contract, type Step04Api } from '../04-utf8/contract'
import { SSE_FIXTURE_CHUNKS } from './fixture'

export interface SseEvent {
  type: string
  data: string
  lastEventId: string
}

export interface ParsedEventStream {
  events: readonly SseEvent[]
  lastEventId: string
  retryMs?: number
}

export interface Step05Api extends Step04Api {
  parseEventStream(chunks: readonly Uint8Array[]): ParsedEventStream
}

export function defineStep05Contract(api: Step05Api): void {
  defineStep04Contract(api)

  it('05 parses WHATWG SSE fields and drops EOF residue', () => {
    expect(api.parseEventStream(SSE_FIXTURE_CHUNKS)).toEqual({
      events: [
        {
          type: 'token',
          data: '{"text":"你"}\n{"text":"好"}',
          lastEventId: '7',
        },
        { type: 'message', data: 'plain', lastEventId: '7' },
      ],
      lastEventId: '7',
      retryMs: 1500,
    })
  })
}
