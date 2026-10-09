import {
  IncomingMessage,
  ServerResponse,
  createServer,
  request as httpRequest,
  type ClientRequest,
  type Server,
} from 'node:http'
import { Socket } from 'node:net'

import { afterEach, describe, expect, it, vi } from 'vitest'

import { createApiMiddleware } from '../dev-api-plugin'
import { VirtualClock } from '../src/engine/clock'
import { createStreamingRenderEngine } from '../src/engine/create-engine'
import { DeepSeekSource } from '../src/live/deepseek-source'
import type { WireProtocol } from '../src/protocol'
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

  it.each(['aborted', 'close'] as const)(
    'rejects and removes body listeners when the request emits %s before end',
    async (termination) => {
      const request = new IncomingMessage(new Socket())
      request.method = 'POST'
      request.url = '/chat'
      const response = new ServerResponse(request)
      const resolveHandler = vi.fn()
      const middleware = createApiMiddleware(resolveHandler)

      middleware(request, response, vi.fn())
      request.emit('data', Buffer.from('{"protocol":'))
      request.emit(termination)
      await new Promise((resolve) => setTimeout(resolve, 0))

      expect(resolveHandler).not.toHaveBeenCalled()
      for (const event of ['data', 'end', 'error', 'aborted', 'close']) {
        expect(request.listenerCount(event), event).toBe(0)
      }
      request.destroy()
      response.destroy()
    },
  )
})

const chatWire = [
  'data: {"id":"c","choices":[{"index":0,"delta":{"content":"hello"}}]}\n\n',
  'data: {"id":"c","choices":[{"index":0,"delta":{},"finish_reason":"stop"}]}\n\n',
  'data: [DONE]\n\n',
].join('')

const responsesWire = [
  'event: response.created\ndata: {"type":"response.created","sequence_number":0,"response":{"id":"r"}}\n\n',
  'event: response.output_text.delta\ndata: {"type":"response.output_text.delta","sequence_number":1,"item_id":"m","output_index":0,"content_index":0,"delta":"hello"}\n\n',
  'event: response.output_text.done\ndata: {"type":"response.output_text.done","sequence_number":2,"item_id":"m","output_index":0,"content_index":0}\n\n',
  'event: response.completed\ndata: {"type":"response.completed","sequence_number":3,"response":{"id":"r"}}\n\n',
].join('')

const anthropicWire = [
  'event: message_start\ndata: {"type":"message_start","message":{"id":"m"}}\n\n',
  'event: content_block_start\ndata: {"type":"content_block_start","index":0,"content_block":{"type":"text"}}\n\n',
  'event: content_block_delta\ndata: {"type":"content_block_delta","index":0,"delta":{"type":"text_delta","text":"hello"}}\n\n',
  'event: content_block_stop\ndata: {"type":"content_block_stop","index":0}\n\n',
  'event: message_delta\ndata: {"type":"message_delta","delta":{"stop_reason":"end_turn"}}\n\n',
  'event: message_stop\ndata: {"type":"message_stop"}\n\n',
].join('')

const protocolWires: Array<[WireProtocol, string]> = [
  ['chat-completions', chatWire],
  ['responses', responsesWire],
  ['anthropic', anthropicWire],
]

describe('Vite middleware to render engine integration', () => {
  it.each(protocolWires)('preserves %s bytes through parser and engine', async (protocol, wire) => {
    vi.stubEnv('ENABLE_LIVE_API', '1')
    vi.stubEnv('DEEPSEEK_API_KEY', 'server-only')
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(wire, { headers: { 'content-type': 'text/event-stream' } })),
    )
    const proxy = await post([
      JSON.stringify({
        protocol,
        model: 'deepseek-v4-flash',
        messages: [{ role: 'user', content: 'hello' }],
      }),
    ])
    const bytes = await proxy.arrayBuffer()
    const source = new DeepSeekSource({
      fetch: async () =>
        new Response(bytes, {
          status: proxy.status,
          headers: { 'content-type': 'text/event-stream' },
        }),
      protocol,
      model: 'deepseek-v4-flash',
      messages: [{ role: 'user', content: 'hello' }],
    })
    const engine = createStreamingRenderEngine({ clock: new VirtualClock() })
    const result = await engine.start({ source, profile: 'M0', reveal: 'direct', trace: 'full' })
      .settled

    expect(result.outcome).toMatchObject({ kind: 'completed' })
    expect(result.snapshot.parts.find((part) => part.kind === 'answer')?.raw).toBe('hello')
    expect(result.snapshot.phase).toBe('settled')
  })
})
