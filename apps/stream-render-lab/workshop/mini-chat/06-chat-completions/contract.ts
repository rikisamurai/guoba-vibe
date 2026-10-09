import { expect, it } from 'vitest'

import { defineStep05Contract, type SseEvent, type Step05Api } from '../05-sse/contract'
import { CHAT_COMPLETIONS_FIXTURE_CHUNKS } from './fixture'

export type ChatCompletionEvent =
  | { kind: 'reasoning-delta'; text: string }
  | { kind: 'content-delta'; text: string }
  | { kind: 'finish'; reason: string }
  | { kind: 'done' }

export interface Step06Api extends Step05Api {
  adaptChatCompletions(events: readonly SseEvent[]): readonly ChatCompletionEvent[]
}

export function defineStep06Contract(api: Step06Api): void {
  defineStep05Contract(api)

  it('06 maps Chat Completions deltas into the mini chat', () => {
    const parsed = api.parseEventStream(CHAT_COMPLETIONS_FIXTURE_CHUNKS)

    expect(api.adaptChatCompletions(parsed.events)).toEqual([
      { kind: 'reasoning-delta', text: '先想' },
      { kind: 'content-delta', text: '再答' },
      { kind: 'finish', reason: 'stop' },
      { kind: 'done' },
    ])
  })
}
