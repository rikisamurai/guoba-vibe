import { parseChatRequest } from '../lib/chat-schema'
import { getModel, getProvider } from '../lib/providers'

export const maxDuration = 60

function json(status: number, payload: Record<string, unknown>): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { 'content-type': 'application/json' },
  })
}

/**
 * SSE passthrough proxy: validates the request against the provider
 * whitelist, attaches the server-side key, and pipes the upstream
 * chat.completions stream back untouched.
 */
export async function POST(request: Request): Promise<Response> {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return json(400, { error: 'invalid JSON body' })
  }

  const parsed = parseChatRequest(body)
  if (!parsed.ok) return json(400, { error: parsed.error })

  const provider = getProvider(parsed.value.provider)
  if (provider === null) return json(400, { error: 'unknown provider' })
  const model = getModel(provider, parsed.value.model)
  if (model === null) return json(400, { error: 'model not in whitelist' })

  const key = process.env[provider.envKey]
  if (key === undefined || key === '') {
    return json(500, { error: `${provider.envKey} is not configured` })
  }

  const upstream = await fetch(`${provider.baseUrl}/chat/completions`, {
    method: 'POST',
    headers: { authorization: `Bearer ${key}`, 'content-type': 'application/json' },
    body: JSON.stringify({
      model: model.id,
      stream: true,
      messages: parsed.value.messages,
      ...model.extraBody,
    }),
    signal: request.signal,
  })

  if (!upstream.ok) {
    const detail = (await upstream.text()).slice(0, 500)
    return json(502, { error: `upstream ${upstream.status}`, detail })
  }
  if (upstream.body === null) return json(502, { error: 'upstream returned no body' })

  return new Response(upstream.body, {
    status: 200,
    headers: {
      'content-type': 'text/event-stream',
      'cache-control': 'no-cache, no-transform',
      'x-accel-buffering': 'no',
    },
  })
}
