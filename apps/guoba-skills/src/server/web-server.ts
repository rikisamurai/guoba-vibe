import { randomUUID } from 'node:crypto'
import { createReadStream } from 'node:fs'
import { access, stat } from 'node:fs/promises'
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http'
import { extname, join, relative, resolve } from 'node:path'

import type { ServiceController } from '../service/controller'
import { isServiceAction, type ServiceAction } from '../shared/types'

interface ServerOptions {
  port?: number
  staticRoot: string
}

export async function startWebServer(controller: ServiceController, options: ServerOptions) {
  await access(join(options.staticRoot, 'index.html'))
  const sessionToken = randomUUID()
  const server = createServer((request, response) => {
    void routeRequest(controller, options.staticRoot, sessionToken, request, response)
  })
  await new Promise<void>((resolveListening, reject) => {
    server.once('error', reject)
    server.listen(options.port ?? 4178, '127.0.0.1', resolveListening)
  })
  const address = server.address()
  if (!address || typeof address === 'string')
    throw new Error('Could not determine Web UI address.')
  return {
    url: `http://127.0.0.1:${address.port}`,
    close: async () => {
      await new Promise<void>((resolveClose, reject) =>
        server.close((error) => {
          if (error) reject(error)
          else resolveClose()
        }),
      )
      await controller.dispose()
    },
  }
}

async function routeRequest(
  controller: ServiceController,
  staticRoot: string,
  sessionToken: string,
  request: IncomingMessage,
  response: ServerResponse,
): Promise<void> {
  try {
    if (request.method === 'POST' && request.url === '/api/invoke') {
      assertTrustedMutation(request, sessionToken)
      const raw: unknown = JSON.parse(await readBody(request))
      const body = parseInvocation(raw)
      json(response, 200, { data: await controller.invoke(body.action, body.payload) })
      return
    }
    if (request.method === 'GET' && request.url === '/api/health') {
      json(response, 200, { ok: true })
      return
    }
    await serveStatic(staticRoot, request.url ?? '/', sessionToken, response)
  } catch (error) {
    json(response, 400, { error: error instanceof Error ? error.message : String(error) })
  }
}

async function serveStatic(
  root: string,
  url: string,
  sessionToken: string,
  response: ServerResponse,
): Promise<void> {
  const pathname = decodeURIComponent(new URL(url, 'http://localhost').pathname)
  let path = resolve(root, `.${pathname}`)
  if (relative(resolve(root), path).startsWith('..')) throw new Error('Invalid asset path.')
  try {
    if ((await stat(path)).isDirectory()) path = join(path, 'index.html')
  } catch {
    path = join(root, 'index.html')
  }
  response.writeHead(200, {
    'Cache-Control': 'no-store',
    'Content-Type': mimeType(path),
    'Referrer-Policy': 'no-referrer',
    'Set-Cookie': `guoba_skills_session=${sessionToken}; HttpOnly; SameSite=Strict; Path=/`,
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
  })
  createReadStream(path).pipe(response)
}

async function readBody(request: IncomingMessage): Promise<string> {
  const chunks: Buffer[] = []
  let size = 0
  for await (const chunk of request) {
    const buffer = Buffer.from(chunk)
    size += buffer.length
    if (size > 1_000_000) throw new Error('Request body is too large.')
    chunks.push(buffer)
  }
  return Buffer.concat(chunks).toString('utf8')
}

function json(response: ServerResponse, status: number, value: unknown): void {
  response.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' })
  response.end(JSON.stringify(value))
}

function mimeType(path: string): string {
  return (
    {
      '.css': 'text/css; charset=utf-8',
      '.html': 'text/html; charset=utf-8',
      '.js': 'text/javascript; charset=utf-8',
      '.svg': 'image/svg+xml',
      '.woff2': 'font/woff2',
    }[extname(path)] ?? 'application/octet-stream'
  )
}

function parseInvocation(value: unknown): { action: ServiceAction; payload?: unknown } {
  if (typeof value !== 'object' || value === null) throw new Error('Invalid service request.')
  const action: unknown = Reflect.get(value, 'action')
  if (!isServiceAction(action)) throw new Error('Unknown service action.')
  return { action, payload: Reflect.get(value, 'payload') }
}

function assertTrustedMutation(request: IncomingMessage, sessionToken: string): void {
  const host = request.headers.host
  const origin = request.headers.origin
  const contentType = request.headers['content-type']
  const cookies = request.headers.cookie?.split(/;\s*/u) ?? []
  if (!host || !/^127\.0\.0\.1:\d+$/u.test(host) || origin !== `http://${host}`) {
    throw new Error('Untrusted Web UI origin.')
  }
  if (!contentType?.startsWith('application/json')) {
    throw new Error('Web UI requests must use application/json.')
  }
  if (!cookies.includes(`guoba_skills_session=${sessionToken}`)) {
    throw new Error('Web UI session is missing or expired.')
  }
}
