import { afterEach, expect, test, vi } from 'vitest'

import type { StreamEvent } from '../types/stream'
import { createChatSource } from './chat-source'

afterEach(() => {
  vi.unstubAllGlobals()
})

function sseResponse(chunks: string[]): Response {
  const encoder = new TextEncoder()
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      for (const chunk of chunks) controller.enqueue(encoder.encode(chunk))
      controller.close()
    },
  })
  return new Response(stream, { status: 200 })
}

async function drain(events: AsyncIterable<StreamEvent>): Promise<StreamEvent[]> {
  const collected: StreamEvent[] = []
  for await (const event of events) collected.push(event)
  return collected
}

test('turns SSE bytes into deltas and done', async () => {
  const chunks = [
    'data: {"choices":[{"delta":{"content":"Hel"}}]}\n\n',
    'data: {"choices":[{"delta":{"content":"lo"}}]}\n\ndata: [DONE]\n\n',
  ]
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(sseResponse(chunks)))
  const source = createChatSource({ provider: 'deepseek', model: 'm', messages: [] })
  const events = await drain(source.events)
  expect(events).toEqual([
    { type: 'delta', text: 'Hel' },
    { type: 'delta', text: 'lo' },
    { type: 'done' },
  ])
})

test('stream ending without [DONE] still resolves to done', async () => {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue(sseResponse(['data: {"choices":[{"delta":{"content":"x"}}]}\n\n'])),
  )
  const source = createChatSource({ provider: 'deepseek', model: 'm', messages: [] })
  const events = await drain(source.events)
  expect(events.at(-1)).toEqual({ type: 'done', finishReason: 'eof' })
})

test('maps HTTP errors to an error event with the server message', async () => {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ error: 'model not in whitelist' }), {
        status: 400,
      }),
    ),
  )
  const source = createChatSource({ provider: 'deepseek', model: 'nope', messages: [] })
  const events = await drain(source.events)
  expect(events).toEqual([{ type: 'error', message: 'model not in whitelist' }])
})

test('network failures become error events', async () => {
  vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('fetch failed')))
  const source = createChatSource({ provider: 'deepseek', model: 'm', messages: [] })
  const events = await drain(source.events)
  expect(events[0].type).toBe('error')
})

test('abort ends the iterator without an error event', async () => {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockImplementation((_url: string, init: RequestInit) => {
      return new Promise((_resolve, reject) => {
        init.signal?.addEventListener('abort', () => {
          reject(new DOMException('aborted', 'AbortError'))
        })
      })
    }),
  )
  const source = createChatSource({ provider: 'deepseek', model: 'm', messages: [] })
  const draining = drain(source.events)
  source.abort()
  expect(await draining).toEqual([])
})
