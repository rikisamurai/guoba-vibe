import process from 'node:process'

import { resolveLiveConfig } from './live-config'
import { readBoundedJson } from './request-body'
import { parseLiveRequest } from './schema'
import { buildUpstreamRequest } from './upstream'

export const maxDuration = 60

function json(status: number, payload: Record<string, unknown>): Response {
  return Response.json(payload, {
    status,
    headers: { 'cache-control': 'no-store' },
  })
}

export async function POST(request: Request): Promise<Response> {
  const config = resolveLiveConfig(process.env)
  if (config.capability.kind === 'disabled') {
    return json(403, { error: 'live_disabled' })
  }
  if (config.capability.kind === 'missing_key' || config.deepseekApiKey === undefined) {
    return json(503, { error: 'live_missing_key' })
  }

  const body = await readBoundedJson(request)
  if (!body.ok && body.reason === 'too_large') {
    return json(413, { error: 'request_too_large' })
  }
  const parsed = parseLiveRequest(body.ok ? body.value : null)
  if (!parsed.ok) return json(400, { error: parsed.error })

  const upstreamRequest = buildUpstreamRequest(parsed.value, config.deepseekApiKey)
  let upstream: Response
  try {
    upstream = await fetch(upstreamRequest.url, {
      method: 'POST',
      headers: upstreamRequest.headers,
      body: upstreamRequest.body,
      signal: request.signal,
    })
  } catch (error) {
    return json(502, {
      error: 'upstream_transport',
      detail: error instanceof Error ? error.message : String(error),
    })
  }
  if (!upstream.ok) {
    return json(502, {
      error: 'upstream_rejected',
      status: upstream.status,
      detail: (await upstream.text()).slice(0, 500),
    })
  }
  if (upstream.body === null) return json(502, { error: 'upstream_empty_body' })
  return new Response(upstream.body, {
    headers: {
      'content-type': 'text/event-stream; charset=utf-8',
      'cache-control': 'no-cache, no-transform',
      'x-accel-buffering': 'no',
    },
  })
}
