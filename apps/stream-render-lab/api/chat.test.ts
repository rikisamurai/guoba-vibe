import { afterEach, describe, expect, it, vi } from 'vitest'

import { POST } from './chat'
import { MAX_REQUEST_BODY_BYTES } from './request-body'

const body = {
  protocol: 'responses',
  model: 'deepseek-v4-flash',
  messages: [{ role: 'user', content: 'Hello' }],
}

function request(payload: unknown): Request {
  return new Request('http://localhost/api/chat', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload),
  })
}

afterEach(() => {
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
})

describe('POST /api/chat', () => {
  it('returns an explicit live_disabled result on public deployments', async () => {
    vi.stubEnv('ENABLE_LIVE_API', '0')
    const response = await POST(request(body))
    expect(response.status).toBe(403)
    expect(await response.json()).toEqual({ error: 'live_disabled' })
  })

  it('forwards Responses SSE bytes without parsing them', async () => {
    vi.stubEnv('ENABLE_LIVE_API', '1')
    vi.stubEnv('DEEPSEEK_API_KEY', 'secret')
    const bytes = new TextEncoder().encode('event: response.completed\ndata: {"ok":true}\n\n')
    const fetchMock = vi.fn(
      async () =>
        new Response(bytes, {
          headers: { 'content-type': 'text/event-stream' },
        }),
    )
    vi.stubGlobal('fetch', fetchMock)

    const response = await POST(request(body))
    expect(response.status).toBe(200)
    expect(await response.text()).toBe(new TextDecoder().decode(bytes))
    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.deepseek.com/responses',
      expect.objectContaining({ method: 'POST' }),
    )
  })

  it('rejects an oversized declared body before calling upstream', async () => {
    vi.stubEnv('ENABLE_LIVE_API', '1')
    vi.stubEnv('DEEPSEEK_API_KEY', 'secret')
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    const oversized = request(body)
    oversized.headers.set('content-length', String(MAX_REQUEST_BODY_BYTES + 1))

    const response = await POST(oversized)

    expect(response.status).toBe(413)
    expect(await response.json()).toEqual({ error: 'request_too_large' })
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('stops reading an undeclared body after the streaming byte cap', async () => {
    vi.stubEnv('ENABLE_LIVE_API', '1')
    vi.stubEnv('DEEPSEEK_API_KEY', 'secret')
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    const oversized = new Request('http://localhost/api/chat', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: 'x'.repeat(MAX_REQUEST_BODY_BYTES + 1),
    })

    const response = await POST(oversized)

    expect(response.status).toBe(413)
    expect(await response.json()).toEqual({ error: 'request_too_large' })
    expect(fetchMock).not.toHaveBeenCalled()
  })
})
