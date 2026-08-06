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
    const observations: string[] = []
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
      onObservation: (observation) => observations.push(observation.stage),
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
    expect(observations).toEqual(['headers', 'first-byte', 'content'])
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
        type: 'diagnostic',
        level: 'warning',
        code: 'live_disabled',
        message: 'live_disabled',
      },
      {
        type: 'response.end',
        outcome: {
          kind: 'failed',
          failure: { kind: 'provider', code: 'live_disabled', message: 'live_disabled' },
        },
      },
    ])
  })

  it('retains proxy status and detail in the final failure and diagnostics', async () => {
    const source = new DeepSeekSource({
      fetch: async () =>
        Response.json(
          { error: 'upstream_rejected', status: 429, detail: 'rate limited' },
          { status: 502 },
        ),
      protocol: 'responses',
      model: 'deepseek-v4-flash',
      messages: [{ role: 'user', content: 'hello' }],
    })
    const events = await collect(source)
    expect(events).toContainEqual({
      type: 'diagnostic',
      level: 'warning',
      code: 'upstream_rejected',
      message: 'upstream_rejected: upstream 429: rate limited',
    })
    expect(events.at(-1)).toMatchObject({
      type: 'response.end',
      outcome: {
        kind: 'failed',
        failure: { message: 'upstream_rejected: upstream 429: rate limited' },
      },
    })
  })
})
