import { existsSync } from 'node:fs'

import { serve } from '@hono/node-server'
import { Hono } from 'hono'

if (existsSync('.env')) process.loadEnvFile('.env')

const app = new Hono()

app.get('/api/health', (c) => c.json({ ok: true }))

const port = Number(process.env.PORT ?? 8787)
serve({ fetch: app.fetch, port })
console.log(`[server] listening on http://localhost:${port}`)
