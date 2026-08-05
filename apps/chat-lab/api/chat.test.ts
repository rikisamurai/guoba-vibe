import { afterEach, beforeEach, expect, test, vi } from 'vitest'

import { POST } from './chat'

const VALID_BODY = {
  provider: 'deepseek',
  model: 'deepseek-v4-flash',
  messages: [{ role: 'user', content: 'hi' }],
}

function request(body: unknown): Request {
  return new Request('http://localhost/api/chat', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  })
}

beforeEach(() => {
  vi.stubEnv('DEEPSEEK_API_KEY', 'test-key')
})

afterEach(() => {
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
})

test('rejects invalid JSON with 400', async () => {
  const response = await POST(request('{oops'))
  expect(response.status).toBe(400)
})

test('rejects unknown provider and non-whitelisted model', async () => {
  expect((await POST(request({ ...VALID_BODY, provider: 'openai' }))).status).toBe(400)
  expect((await POST(request({ ...VALID_BODY, model: 'gpt-4o' }))).status).toBe(400)
})

test('returns 500 when the provider key is missing', async () => {
  vi.stubEnv('DEEPSEEK_API_KEY', '')
  const response = await POST(request(VALID_BODY))
  expect(response.status).toBe(500)
  const payload: unknown = await response.json()
  expect(payload).toMatchObject({ error: expect.stringContaining('DEEPSEEK_API_KEY') })
})

test('forwards to the provider with auth, stream flag and extra body', async () => {
  const upstream = new Response('data: [DONE]\n\n', { status: 200 })
  const fetchMock = vi.fn().mockResolvedValue(upstream)
  vi.stubGlobal('fetch', fetchMock)

  const response = await POST(request(VALID_BODY))
  expect(response.status).toBe(200)
  expect(response.headers.get('content-type')).toBe('text/event-stream')

  expect(fetchMock).toHaveBeenCalledOnce()
  const call: unknown[] = fetchMock.mock.calls[0]
  expect(call[0]).toBe('https://api.deepseek.com/chat/completions')
  const init = call[1]
  if (typeof init !== 'object' || init === null) throw new Error('missing fetch init')
  const { headers, body } = init as RequestInit
  expect(new Headers(headers).get('authorization')).toBe('Bearer test-key')
  if (typeof body !== 'string') throw new Error('expected a string body')
  const sent: unknown = JSON.parse(body)
  expect(sent).toMatchObject({
    model: 'deepseek-v4-flash',
    stream: true,
    thinking: { type: 'disabled' },
    messages: VALID_BODY.messages,
  })
})

test('streams the upstream body through untouched', async () => {
  const payload = 'data: {"choices":[{"delta":{"content":"hello"}}]}\n\ndata: [DONE]\n\n'
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(payload, { status: 200 })))

  const response = await POST(request(VALID_BODY))
  expect(await response.text()).toBe(payload)
})

test('maps upstream failures to 502 with detail', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('rate limited', { status: 429 })))
  const response = await POST(request(VALID_BODY))
  expect(response.status).toBe(502)
  const payload: unknown = await response.json()
  expect(payload).toMatchObject({
    error: expect.stringContaining('429'),
    detail: expect.stringContaining('rate limited'),
  })
})
