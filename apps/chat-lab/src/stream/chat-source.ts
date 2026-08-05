import type { ChatRequestMessage } from '../../lib/chat-schema'
import type { StreamEvent, TokenSource } from '../types/stream'
import { parseOpenAiData } from './openai-stream'
import { createSseParser } from './sse-parser'

export interface ChatSourceBody {
  provider: string
  model: string
  messages: ChatRequestMessage[]
}

async function readErrorMessage(response: Response): Promise<string> {
  try {
    const payload: unknown = await response.json()
    if (typeof payload === 'object' && payload !== null && 'error' in payload) {
      const error = (payload as { error?: unknown }).error
      if (typeof error === 'string') return error
    }
  } catch {
    // fall through to the generic message
  }
  return `request failed with status ${response.status}`
}

/** Real token source: POST /api/chat, then bytes → SSE events → StreamEvents. */
export function createChatSource(body: ChatSourceBody): TokenSource {
  const controller = new AbortController()
  let aborted = false

  async function* generate(): AsyncGenerator<StreamEvent> {
    let response: Response
    try {
      response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
        signal: controller.signal,
      })
    } catch {
      if (!aborted) yield { type: 'error', message: 'network error reaching /api/chat' }
      return
    }
    if (!response.ok) {
      yield { type: 'error', message: await readErrorMessage(response) }
      return
    }
    if (response.body === null) {
      yield { type: 'error', message: 'response had no body' }
      return
    }

    const parser = createSseParser()
    const reader = response.body.getReader()
    try {
      for (;;) {
        // oxlint-disable-next-line no-await-in-loop -- byte stream is inherently sequential
        const { done, value } = await reader.read()
        const events = done ? parser.flush() : parser.push(value)
        for (const sse of events) {
          const event = parseOpenAiData(sse.data)
          if (event === null) continue
          yield event
          if (event.type !== 'delta') return
        }
        if (done) break
      }
      // upstream closed without [DONE]; treat the text we have as complete
      yield { type: 'done', finishReason: 'eof' }
    } catch {
      if (!aborted) yield { type: 'error', message: 'stream interrupted' }
    }
  }

  return {
    events: generate(),
    abort() {
      aborted = true
      controller.abort()
    },
  }
}
