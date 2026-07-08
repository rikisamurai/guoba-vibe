import type { IncomingMessage, ServerResponse } from 'node:http'

import type { Plugin } from 'vite'

type WebHandler = (request: Request) => Promise<Response>

function toRequest(req: IncomingMessage): Request {
  const url = `http://${req.headers.host ?? 'localhost'}/api${req.url ?? '/'}`
  const headers = new Headers()
  for (const [key, value] of Object.entries(req.headers)) {
    if (typeof value === 'string') headers.set(key, value)
  }
  return new Request(url, { method: req.method, headers })
}

async function sendResponse(res: ServerResponse, response: Response): Promise<void> {
  res.statusCode = response.status
  response.headers.forEach((value, key) => res.setHeader(key, value))
  if (response.body) {
    for await (const chunk of response.body) res.write(chunk)
  }
  res.end()
}

function hasGetHandler(mod: object): mod is { GET: WebHandler } {
  return 'GET' in mod && typeof (mod as { GET?: unknown }).GET === 'function'
}

export function devApiPlugin(): Plugin {
  return {
    name: 'guoba-dev-api',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use('/api', (req, res, next) => {
        const name = (req.url ?? '').split('?')[0].replaceAll('/', '')
        if (name !== 'resolve' && name !== 'download') {
          next()
          return
        }
        server
          .ssrLoadModule(`/api/${name}.ts`)
          .then((mod) => {
            if (!hasGetHandler(mod)) throw new Error(`No GET handler in /api/${name}.ts`)
            return mod.GET(toRequest(req))
          })
          .then((response) => sendResponse(res, response))
          .catch((error: unknown) => {
            res.statusCode = 500
            res.end(String(error))
          })
      })
    },
  }
}
