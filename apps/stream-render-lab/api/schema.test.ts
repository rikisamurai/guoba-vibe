import { describe, expect, it } from 'vitest'

import { parseLiveRequest } from './schema'

const message = { role: 'user', content: 'Explain SSE.' }

describe('parseLiveRequest', () => {
  it('accepts each documented DeepSeek protocol', () => {
    for (const protocol of ['chat-completions', 'responses', 'anthropic']) {
      const result = parseLiveRequest({
        protocol,
        model: 'deepseek-v4-flash',
        messages: [message],
      })
      expect(result.ok).toBe(true)
    }
  })

  it('rejects models outside the dated capability whitelist', () => {
    expect(
      parseLiveRequest({
        protocol: 'responses',
        model: 'deepseek-v4-pro',
        messages: [message],
      }),
    ).toEqual({ ok: false, error: 'model is not enabled for responses' })
  })

  it('rejects oversized conversations', () => {
    expect(
      parseLiveRequest({
        protocol: 'responses',
        model: 'deepseek-v4-flash',
        messages: [{ role: 'user', content: 'x'.repeat(32_001) }],
      }),
    ).toEqual({ ok: false, error: 'message content exceeds 32000 characters' })
  })

  it('rejects conversations whose aggregate content exceeds the limit', () => {
    expect(
      parseLiveRequest({
        protocol: 'responses',
        model: 'deepseek-v4-flash',
        messages: [
          { role: 'user', content: 'a'.repeat(32_000) },
          { role: 'assistant', content: 'b'.repeat(32_000) },
          { role: 'user', content: 'c' },
        ],
      }),
    ).toEqual({ ok: false, error: 'message content total exceeds 64000 characters' })
  })
})
