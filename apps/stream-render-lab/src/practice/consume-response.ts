import type { RunOutcome } from '../protocol/types'
import type { Pipeline, ReadAnswerOptions, ReadRecord } from './types'

// Shared transport scaffold. Learner functions are supplied by the selected implementation.
export async function consumeResponse(
  response: Response,
  options: ReadAnswerOptions,
  pipeline: Pipeline,
): Promise<RunOutcome | undefined> {
  options.signal.throwIfAborted()
  if (!response.ok) throw new Error(`HTTP ${response.status}：请检查服务，再重试`)
  if (!response.headers.get('content-type')?.includes('text/event-stream'))
    throw new Error('服务没有返回 SSE，请检查请求地址')
  if (!response.body) throw new Error('响应没有可读的数据流')
  const reader = response.body.getReader()
  const decoder = pipeline.createDecoder()
  const parser = pipeline.createEventParser()
  const readEvent = pipeline.createEventReader()
  const cancel = () => {
    void reader.cancel().catch(() => {})
  }
  options.signal.addEventListener('abort', cancel, { once: true })
  let index = 0
  try {
    while (true) {
      options.signal.throwIfAborted()
      // oxlint-disable-next-line no-await-in-loop -- consume in observed stream order
      const { done, value } = await reader.read()
      options.signal.throwIfAborted()
      const decoded = done ? decoder.finish() : decoder.push(value)
      const events = [...parser.push(decoded), ...(done ? parser.finish() : [])]
      const record: ReadRecord = {
        index: index++,
        bytes: Array.from(value ?? []),
        decoded,
        events,
        text: [],
        eof: done,
      }
      if (!done) options.onBytes?.(value.byteLength)
      let outcome: RunOutcome | undefined
      try {
        for (const event of events) {
          options.signal.throwIfAborted()
          const result = readEvent(event)
          if (result.text) {
            record.text.push(result.text)
            options.onText(result.text)
          }
          if (result.outcome) {
            outcome = result.outcome
            break
          }
        }
      } finally {
        options.onRecord?.(record)
      }
      options.signal.throwIfAborted()
      if (outcome || done) return outcome
    }
  } finally {
    options.signal.removeEventListener('abort', cancel)
    await reader.cancel().catch(() => {})
    reader.releaseLock()
  }
}
