import type { IncomingMessage, ServerResponse } from 'node:http'

import type { Plugin } from 'vite'

type WebHandler = (request: Request) => Promise<Response>

async function readBody(req: IncomingMessage): Promise<Buffer> {
  const chunks: Buffer[] = []
  for await (const chunk of req) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk)
  }
  return Buffer.concat(chunks)
}

function toRequest(req: IncomingMessage, body: Buffer, signal: AbortSignal): Request {
  const url = `http://${req.headers.host ?? 'localhost'}/api${req.url ?? '/'}`
  const headers = new Headers()
  for (const [key, value] of Object.entries(req.headers)) {
    if (typeof value === 'string') headers.set(key, value)
  }
  const method = req.method ?? 'GET'
  return new Request(url, {
    method,
    headers,
    signal,
    ...(method === 'POST' ? { body } : {}),
  })
}

async function sendResponse(res: ServerResponse, response: Response): Promise<void> {
  res.statusCode = response.status
  response.headers.forEach((value, key) => res.setHeader(key, value))
  if (response.body) {
    for await (const chunk of response.body) res.write(chunk)
  }
  res.end()
}

function hasPostHandler(mod: object): mod is { POST: WebHandler } {
  return 'POST' in mod && typeof (mod as { POST?: unknown }).POST === 'function'
}

/**
 * Dev-only bridge from Vite middleware to the Web-standard handler in
 * api/chat.ts — the same shape Vercel runs in production. Streams the
 * response body chunk by chunk and cancels the upstream when the browser
 * disconnects (Stop button, tab close).
 */
export function devApiPlugin(): Plugin {
  return {
    name: 'chat-lab-dev-api',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use('/api', (req, res, next) => {
        const name = (req.url ?? '').split('?')[0].replaceAll('/', '')
        if (name !== 'chat') {
          next()
          return
        }
        const controller = new AbortController()
        res.on('close', () => {
          if (!res.writableEnded) controller.abort()
        })
        readBody(req)
          .then(async (body) => {
            const mod = await server.ssrLoadModule('/api/chat.ts')
            if (!hasPostHandler(mod)) throw new Error('No POST handler in /api/chat.ts')
            const response = await mod.POST(toRequest(req, body, controller.signal))
            await sendResponse(res, response)
          })
          .catch((error: unknown) => {
            if (controller.signal.aborted || res.writableEnded) {
              res.end()
              return
            }
            res.statusCode = 500
            res.end(String(error))
          })
      })
    },
  }
}
