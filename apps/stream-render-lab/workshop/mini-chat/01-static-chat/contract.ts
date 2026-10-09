import type { ReactNode } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { expect, it } from 'vitest'

import { STATIC_CHAT_FIXTURE } from './fixture'

const EXACT_REPLY = `${STATIC_CHAT_FIXTURE.reply}\n`

export interface ChatMessage {
  role: 'user' | 'assistant'
  text: string
}

export type ChatPhase = 'idle' | 'waiting' | 'completed'

export interface ChatSnapshot {
  messages: readonly ChatMessage[]
  phase: ChatPhase
}

export interface NonStreamingTurnInput {
  complete: (prompt: string) => Promise<string>
  prompt: string
  publish: (snapshot: ChatSnapshot) => void
}

export interface Step01Api {
  MiniChat(props: { chat: ChatSnapshot }): ReactNode
  sendNonStreamingTurn(input: NonStreamingTurnInput): Promise<void>
}

export function defineStep01Contract(api: Step01Api): void {
  it('01 publishes waiting first, then one complete assistant reply', async () => {
    const completion = deferred<string>()
    const calls: string[] = []
    const prompts: string[] = []
    const published: ChatSnapshot[] = []

    const settled = api.sendNonStreamingTurn({
      prompt: STATIC_CHAT_FIXTURE.prompt,
      complete(prompt) {
        calls.push('complete')
        prompts.push(prompt)
        return completion.promise
      },
      publish(snapshot) {
        calls.push(`publish:${snapshot.phase}`)
        published.push(snapshot)
      },
    })

    expect(prompts).toEqual([STATIC_CHAT_FIXTURE.prompt])
    expect(calls).toEqual(['publish:waiting', 'complete'])
    expect(published).toEqual([waitingSnapshot()])
    expect(renderToStaticMarkup(api.MiniChat({ chat: published[0] }))).toContain(
      '<p role="status">正在等待完整回复…</p>',
    )

    completion.resolve(EXACT_REPLY)
    await settled

    expect(prompts).toEqual([STATIC_CHAT_FIXTURE.prompt])
    expect(calls).toEqual(['publish:waiting', 'complete', 'publish:completed'])
    expect(published).toEqual([waitingSnapshot(), completedSnapshot()])
    expect(renderToStaticMarkup(api.MiniChat({ chat: published[1] }))).toContain(
      `<article data-role="assistant"><strong>Assistant</strong><p>${EXACT_REPLY}</p></article>`,
    )
  })
}

function waitingSnapshot(): ChatSnapshot {
  return {
    phase: 'waiting',
    messages: [{ role: 'user', text: STATIC_CHAT_FIXTURE.prompt }],
  }
}

function completedSnapshot(): ChatSnapshot {
  return {
    phase: 'completed',
    messages: [
      { role: 'user', text: STATIC_CHAT_FIXTURE.prompt },
      { role: 'assistant', text: EXACT_REPLY },
    ],
  }
}

function deferred<T>(): {
  promise: Promise<T>
  resolve(value: T): void
} {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((accept) => {
    resolve = accept
  })
  return { promise, resolve }
}
