import {
  createServer,
  request as httpRequest,
  type ClientRequest,
  type IncomingMessage,
  type Server,
  type ServerResponse,
} from 'node:http'

import { afterEach, describe, expect, it, vi } from 'vitest'

import { createApiMiddleware } from '../dev-api-plugin'
import { POST as chat } from './chat'
import { MAX_REQUEST_BODY_BYTES } from './request-body'

type Middleware = (request: IncomingMessage, response: ServerResponse, next: () => void) => void

function previewMiddleware(): Middleware {
  return createApiMiddleware(async (route, method) => {
    if (route === 'chat' && method === 'POST') return chat
    return null
  })
}

async function listen(server: Server): Promise<number> {
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
  const address = server.address()
  if (address === null || typeof address === 'string') throw new TypeError('missing port')
  return address.port
}

async function close(server: Server): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    server.close((error) => {
      if (error !== undefined) {
        reject(error)
        return
      }
      resolve()
    })
  })
}

async function post(
  chunks: string[],
  contentLength?: number,
  endRequest = true,
): Promise<Response> {
  const middleware = previewMiddleware()
  const server = createServer((request, response) => {
    middleware(request, response, () => {
      response.statusCode = 404
      response.end()
    })
  })
  const port = await listen(server)
  let client: ClientRequest | undefined
  try {
    return await new Promise<Response>((resolve, reject) => {
      let settled = false
      const finish = (response: Response) => {
        if (settled) return
        settled = true
        clearTimeout(timeout)
        resolve(response)
      }
      client = httpRequest(
        {
          host: '127.0.0.1',
          port,
          path: '/chat',
          method: 'POST',
          headers: contentLength === undefined ? {} : { 'content-length': contentLength },
        },
        (response) => {
          const body: Uint8Array[] = []
          response.on('data', (chunk: Uint8Array) => body.push(chunk))
          response.on('end', () =>
            finish(
              new Response(Buffer.concat(body), {
                status: response.statusCode,
              }),
            ),
          )
        },
      )
      const timeout = setTimeout(() => finish(new Response(null, { status: 599 })), 250)
      client.on('error', (error) => {
        if (!settled) reject(error)
      })
      chunks.forEach((chunk) => client?.write(chunk))
      if (endRequest) client.end()
    })
  } finally {
    client?.destroy()
    server.closeAllConnections()
    await close(server)
  }
}

afterEach(() => {
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
})

describe('Vite API middleware body limits', () => {
  it('returns 413 when Content-Length declares an oversized request', async () => {
    vi.stubEnv('ENABLE_LIVE_API', '1')
    vi.stubEnv('DEEPSEEK_API_KEY', 'secret')
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)

    const response = await post(
      ['x'.repeat(MAX_REQUEST_BODY_BYTES + 1)],
      MAX_REQUEST_BODY_BYTES + 1,
    )

    expect(response.status).toBe(413)
    expect(await response.json()).toEqual({ error: 'request_too_large' })
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('returns 413 while streaming an oversized chunked request', async () => {
    vi.stubEnv('ENABLE_LIVE_API', '1')
    vi.stubEnv('DEEPSEEK_API_KEY', 'secret')
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)

    const response = await post(['x'.repeat(MAX_REQUEST_BODY_BYTES), 'x'])

    expect(response.status).toBe(413)
    expect(await response.json()).toEqual({ error: 'request_too_large' })
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('rejects a chunked body before the client finishes sending it', async () => {
    vi.stubEnv('ENABLE_LIVE_API', '1')
    vi.stubEnv('DEEPSEEK_API_KEY', 'secret')
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)

    const response = await post(['x'.repeat(MAX_REQUEST_BODY_BYTES + 1)], undefined, false)

    expect(response.status).toBe(413)
    expect(fetchMock).not.toHaveBeenCalled()
  })
})
