import { describe, expect, it } from 'vitest'

import type { LiveRequest } from './schema'
import { LIVE_MAX_OUTPUT_TOKENS, buildUpstreamRequest } from './upstream'

const base: Omit<LiveRequest, 'protocol'> = {
  model: 'deepseek-v4-flash',
  messages: [{ role: 'user', content: 'hello' }],
}

describe('DeepSeek upstream request limits', () => {
  it.each([
    ['chat-completions', 'max_tokens'],
    ['responses', 'max_output_tokens'],
    ['anthropic', 'max_tokens'],
  ] as const)('caps %s output with %s', (protocol, field) => {
    const input: LiveRequest = { ...base, protocol }
    const request = buildUpstreamRequest(input, 'server-key')
    const body: unknown = JSON.parse(request.body)

    expect(body).toMatchObject({ [field]: LIVE_MAX_OUTPUT_TOKENS })
  })
})
