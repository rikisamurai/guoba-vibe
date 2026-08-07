import type { ReactNode } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { expect, it } from 'vitest'

import { STATIC_CHAT_FIXTURE } from './fixture'

export interface ChatMessage {
  role: 'user' | 'assistant'
  text: string
}

export interface StaticChat {
  messages: readonly ChatMessage[]
}

export interface Step01Api {
  createStaticChat(input: typeof STATIC_CHAT_FIXTURE): StaticChat
  MiniChat(props: { chat: StaticChat }): ReactNode
}

export function defineStep01Contract(api: Step01Api): void {
  it('01 renders one non-streaming assistant reply', () => {
    const markup = renderToStaticMarkup(
      api.MiniChat({ chat: api.createStaticChat(STATIC_CHAT_FIXTURE) }),
    )

    expect(markup).toContain(
      '<article data-role="assistant"><strong>Assistant</strong><p>因为响应会被拆成多个片段，边到达边显示。</p></article>',
    )
  })
}
