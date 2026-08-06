import type { IncomingMessage, ServerResponse } from 'node:http'

import type { Plugin } from 'vite'

import { GET as capabilities } from './api/capabilities'
import { POST as chat } from './api/chat'
import { declaredBodyIsTooLarge, MAX_REQUEST_BODY_BYTES } from './api/request-body'

type Handler = (request: Request) => Promise<Response> | Response
type ResolveHandler = (route: string, method: string) => Promise<Handler | null>

class RequestTooLargeError extends Error {}

function readBody(request: IncomingMessage): Promise<Uint8Array> {
  const declared = request.headers['content-length']
  if (declaredBodyIsTooLarge(Array.isArray(declared) ? declared[0] : declared)) {
    request.resume()
    return Promise.reject(new RequestTooLargeError())
  }
  return new Promise((resolve, reject) => {
    const chunks: Uint8Array[] = []
    let size = 0
    const cleanup = () => {
      request.off('data', onData)
      request.off('end', onEnd)
      request.off('error', onError)
      request.off('aborted', onAborted)
      request.off('close', onClose)
    }
    const onData = (chunk: Uint8Array | string) => {
      const bytes = typeof chunk === 'string' ? new TextEncoder().encode(chunk) : chunk
      size += bytes.byteLength
      if (size > MAX_REQUEST_BODY_BYTES) {
        cleanup()
        request.resume()
        reject(new RequestTooLargeError())
        return
      }
      chunks.push(bytes)
    }
    const onEnd = () => {
      cleanup()
      const body = new Uint8Array(size)
      let offset = 0
      for (const chunk of chunks) {
        body.set(chunk, offset)
        offset += chunk.byteLength
      }
      resolve(body)
    }
    const onError = (error: Error) => {
      cleanup()
      reject(error)
    }
    const rejectTermination = (event: 'aborted' | 'close') => {
      cleanup()
      reject(new Error(`request body ${event} before end`))
    }
    const onAborted = () => rejectTermination('aborted')
    const onClose = () => rejectTermination('close')
    request.on('data', onData)
    request.on('end', onEnd)
    request.on('error', onError)
    request.on('aborted', onAborted)
    request.on('close', onClose)
  })
}

function webRequest(request: IncomingMessage, body: Uint8Array, signal: AbortSignal): Request {
  const method = request.method ?? 'GET'
  const requestBody = new ArrayBuffer(body.byteLength)
  new Uint8Array(requestBody).set(body)
  const headers = new Headers()
  for (const [key, value] of Object.entries(request.headers)) {
    if (Array.isArray(value)) value.forEach((item) => headers.append(key, item))
    else if (value !== undefined) headers.set(key, value)
  }
  return new Request(`http://${request.headers.host ?? 'localhost'}/api${request.url ?? ''}`, {
    method,
    headers,
    signal,
    ...(method === 'GET' || method === 'HEAD' ? {} : { body: requestBody }),
  })
}

async function send(response: Response, target: ServerResponse): Promise<void> {
  target.statusCode = response.status
  response.headers.forEach((value, key) => target.setHeader(key, value))
  if (response.body !== null) {
    const reader = response.body.getReader()
    while (true) {
      // oxlint-disable-next-line no-await-in-loop -- proxy preserves upstream byte order
      const { done, value } = await reader.read()
      if (done) break
      if (!target.write(value)) {
        // oxlint-disable-next-line no-await-in-loop -- backpressure must preserve byte order
        await waitForDrain(target)
      }
    }
  }
  target.end()
}

function waitForDrain(target: ServerResponse): Promise<void> {
  return new Promise((resolve, reject) => {
    const cleanup = () => {
      target.off('drain', onDrain)
      target.off('close', onClose)
      target.off('error', onError)
    }
    const onDrain = () => {
      cleanup()
      resolve()
    }
    const onClose = () => {
      cleanup()
      reject(new Error('downstream closed'))
    }
    const onError = (error: Error) => {
      cleanup()
      reject(error)
    }
    target.once('drain', onDrain)
    target.once('close', onClose)
    target.once('error', onError)
  })
}

function handlerFrom(module: Record<string, unknown>, method: string): Handler | null {
  const value = module[method]
  if (typeof value !== 'function') return null
  return async (request) => {
    const result = await value(request)
    if (!(result instanceof Response)) throw new TypeError('API handler must return a Response')
    return result
  }
}

export function createApiMiddleware(resolveHandler: ResolveHandler) {
  return (request: IncomingMessage, response: ServerResponse, next: () => void): void => {
    const route = (request.url ?? '').split('?')[0].replaceAll('/', '')
    if (route !== 'chat' && route !== 'capabilities') return next()
    const controller = new AbortController()
    response.on('close', () => controller.abort())
    readBody(request)
      .then(async (body) => {
        const handler = await resolveHandler(route, request.method ?? 'GET')
        if (handler === null) throw new Error('method not allowed')
        await send(await handler(webRequest(request, body, controller.signal)), response)
      })
      .catch((error: unknown) => {
        if (response.writableEnded || response.destroyed) return
        if (error instanceof RequestTooLargeError) {
          response.statusCode = 413
          response.setHeader('content-type', 'application/json')
          response.setHeader('cache-control', 'no-store')
          response.end(JSON.stringify({ error: 'request_too_large' }))
          return
        }
        response.statusCode = 500
        response.end(error instanceof Error ? error.message : String(error))
      })
  }
}

export function devApiPlugin(): Plugin {
  return {
    name: 'stream-render-lab-api',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use(
        '/api',
        createApiMiddleware(async (route, method) => {
          const module = await server.ssrLoadModule(`/api/${route}.ts`)
          return handlerFrom(module, method)
        }),
      )
    },
    configurePreviewServer(server) {
      server.middlewares.use(
        '/api',
        createApiMiddleware(async (route, method) => {
          if (route === 'chat' && method === 'POST') return chat
          if (route === 'capabilities' && method === 'GET') return capabilities
          return null
        }),
      )
    },
  }
}
