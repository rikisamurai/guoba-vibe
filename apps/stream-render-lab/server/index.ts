import { existsSync } from 'node:fs'

import { serve } from '@hono/node-server'
import { Hono } from 'hono'

import type { ChatRequest } from '../src/lib/chat-types'
import { providers } from './providers'

if (existsSync('.env')) process.loadEnvFile('.env')

const app = new Hono()

app.get('/api/health', (c) => c.json({ ok: true }))

app.get('/api/models', (c) =>
  c.json(Object.values(providers).map((p) => ({ id: p.id, label: p.label }))),
)

app.post('/api/chat', async (c) => {
  const body = await c.req.json<ChatRequest>().catch(() => null)
  const provider = body && providers[body.provider]
  if (!provider || !Array.isArray(body.messages) || body.messages.length === 0) {
    return c.json({ error: 'expected { provider: "deepseek" | "kimi", messages: [...] }' }, 400)
  }

  const apiKey = process.env[provider.apiKeyEnv]
  if (!apiKey) return c.json({ error: `${provider.apiKeyEnv} is not set` }, 500)

  const upstream = await fetch(`${provider.baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: process.env[provider.modelEnv] ?? provider.defaultModel,
      messages: body.messages,
      stream: true,
    }),
    // 客户端断开时同步取消上游请求，避免白烧 token
    signal: c.req.raw.signal,
  }).catch((err: unknown) => {
    if (c.req.raw.signal.aborted) return null
    throw err
  })
  if (!upstream) return c.json({ error: 'client aborted' }, 499 as never)

  if (!upstream.ok || !upstream.body) {
    const detail = await upstream.text().catch(() => '')
    return c.json({ error: `upstream responded ${upstream.status}`, detail }, 502)
  }

  // 上游本身就是 OpenAI 兼容的 SSE 字节流，原样透传；协议解析全部留给客户端（学习目标所在）
  return new Response(upstream.body, {
    headers: {
      'content-type': 'text/event-stream; charset=utf-8',
      'cache-control': 'no-cache',
      'x-accel-buffering': 'no',
    },
  })
})

const port = Number(process.env.PORT ?? 8787)
serve({ fetch: app.fetch, port })
console.log(`[server] listening on http://localhost:${port}`)
