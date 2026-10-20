import { adaptChatCompletions } from '../protocol/chat-completions'
import { parseSse } from '../protocol/sse'
import type { RunOutcome } from '../protocol/types'

export interface ReadAnswerOptions {
  signal: AbortSignal
  onText(text: string): void
  onBytes?(byteLength: number): void
}

async function* readBytes(body: ReadableStream<Uint8Array>, options: ReadAnswerOptions) {
  const reader = body.getReader()
  const cancel = () => {
    void reader.cancel().catch(() => {})
  }
  options.signal.addEventListener('abort', cancel, { once: true })
  try {
    while (true) {
      options.signal.throwIfAborted()
      // oxlint-disable-next-line no-await-in-loop -- preserve the HTTP byte order
      const { done, value } = await reader.read()
      options.signal.throwIfAborted()
      if (done) return
      options.onBytes?.(value.byteLength)
      yield value
    }
  } finally {
    options.signal.removeEventListener('abort', cancel)
    await reader.cancel().catch(() => {})
    reader.releaseLock()
  }
}

export async function readAnswer(
  response: Response,
  options: ReadAnswerOptions,
): Promise<RunOutcome> {
  if (!response.ok) throw new Error(`HTTP ${response.status}：请检查服务，再重试`)
  if (!response.headers.get('content-type')?.includes('text/event-stream'))
    throw new Error('服务没有返回 SSE，请检查请求地址')
  if (!response.body) throw new Error('响应没有可读的数据流')
  const events = adaptChatCompletions(parseSse(readBytes(response.body, options)))
  for await (const { event } of events) {
    options.signal.throwIfAborted()
    if (
      event.type === 'part.delta' &&
      event.delta.kind === 'text' &&
      event.partId.includes('answer')
    )
      options.onText(event.delta.text)
    if (event.type === 'response.end') return event.outcome
  }
  return { kind: 'truncated', cause: 'eof', retryable: true }
}
