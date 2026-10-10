import { describe, expect, it, vi } from 'vitest'

import { DeepSeekSource } from './deepseek-source'

async function collect(source: DeepSeekSource) {
  const controller = new AbortController()
  const events = []
  for await (const item of source.open(controller.signal)) events.push(item.event)
  return events
}

describe('DeepSeekSource', () => {
  it('composes a byte response with the selected wire adapter', async () => {
    const wire = [
      'data: {"id":"c","choices":[{"index":0,"delta":{"content":"hi"}}]}\n\n',
      'data: {"id":"c","choices":[{"index":0,"delta":{},"finish_reason":"stop"}]}\n\n',
      'data: [DONE]\n\n',
    ].join('')
    const fetch = vi.fn(
      async () =>
        new Response(wire, {
          headers: { 'content-type': 'text/event-stream' },
        }),
    )
    const source = new DeepSeekSource({
      fetch,
      protocol: 'chat-completions',
      model: 'deepseek-v4-flash',
      messages: [{ role: 'user', content: 'hello' }],
    })

    const events = await collect(source)
    expect(fetch).toHaveBeenCalledWith(
      '/api/chat',
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    )
    expect(events).toContainEqual({
      type: 'part.delta',
      partId: 'answer:0',
      delta: { kind: 'text', text: 'hi' },
    })
    expect(events.at(-1)).toEqual({
      type: 'response.end',
      outcome: { kind: 'completed', reason: 'stop' },
    })
  })

  it('turns an explicit proxy rejection into failed instead of truncated', async () => {
    const source = new DeepSeekSource({
      fetch: async () => Response.json({ error: 'live_disabled' }, { status: 403 }),
      protocol: 'responses',
      model: 'deepseek-v4-flash',
      messages: [{ role: 'user', content: 'hello' }],
    })
    expect(await collect(source)).toEqual([
      {
        type: 'response.end',
        outcome: {
          kind: 'failed',
          failure: { kind: 'provider', code: 'live_disabled', message: 'live_disabled' },
        },
      },
    ])
  })
})
