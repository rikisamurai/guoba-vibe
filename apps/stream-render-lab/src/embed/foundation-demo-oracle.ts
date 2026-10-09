import type { SseEvent } from '../../workshop/mini-chat/05-sse/contract'
import type { ChatCompletionEvent } from '../../workshop/mini-chat/06-chat-completions/contract'

export function expectedSseFromFixture(chunks: readonly Uint8Array[]) {
  const lines = completeFixtureLines(decodeFixture(chunks).replace(/^\uFEFF/, ''))
  const events: SseEvent[] = []
  let data: string[] = []
  let type = ''
  let lastEventId = ''
  let retryMs: number | undefined
  for (const line of lines) {
    if (line === '') {
      if (data.length > 0)
        events.push({ type: type || 'message', data: data.join('\n'), lastEventId })
      data = []
      type = ''
      continue
    }
    if (line.startsWith(':')) continue
    const [field, ...rest] = line.split(':')
    const value = rest.join(':').replace(/^ /, '')
    if (field === 'data') data.push(value)
    if (field === 'event') type = value
    if (field === 'id') lastEventId = value
    if (field === 'retry' && /^\d+$/.test(value)) retryMs = Number(value)
  }
  return { events, lastEventId, ...(retryMs === undefined ? {} : { retryMs }) }
}

export function expectedChatEventsFromFixture(
  chunks: readonly Uint8Array[],
): ChatCompletionEvent[] {
  const events: ChatCompletionEvent[] = []
  for (const line of decodeFixture(chunks).split('\n')) {
    if (!line.startsWith('data: ')) continue
    const data = line.slice(6)
    if (data === '[DONE]') {
      events.push({ kind: 'done' })
      continue
    }
    const payload: unknown = JSON.parse(data)
    if (!isRecord(payload) || !Array.isArray(payload.choices)) {
      throw new Error('Fixture does not contain Chat Completions choices')
    }
    for (const choice of payload.choices) appendChoice(events, choice)
  }
  return events
}

function appendChoice(events: ChatCompletionEvent[], choice: unknown): void {
  if (!isRecord(choice) || !isRecord(choice.delta)) {
    throw new Error('Fixture contains a malformed Chat Completions choice')
  }
  const reasoning = optionalString(choice.delta.reasoning_content)
  const content = optionalString(choice.delta.content)
  const finishReason = optionalString(choice.finish_reason)
  if (reasoning) {
    events.push({ kind: 'reasoning-delta', text: reasoning })
  }
  if (content) events.push({ kind: 'content-delta', text: content })
  if (finishReason) events.push({ kind: 'finish', reason: finishReason })
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function optionalString(value: unknown): string | undefined {
  if (value === undefined || value === null) return undefined
  if (typeof value === 'string') return value
  throw new Error('Fixture field must be a string')
}

function completeFixtureLines(text: string): string[] {
  const lines: string[] = []
  const lineEnd = /\r\n|\r|\n/g
  let start = 0
  for (let match = lineEnd.exec(text); match; match = lineEnd.exec(text)) {
    lines.push(text.slice(start, match.index))
    start = match.index + match[0].length
  }
  return lines
}

function decodeFixture(chunks: readonly Uint8Array[]): string {
  const length = chunks.reduce((total, chunk) => total + chunk.length, 0)
  const bytes = new Uint8Array(length)
  let offset = 0
  for (const chunk of chunks) {
    bytes.set(chunk, offset)
    offset += chunk.length
  }
  return new TextDecoder().decode(bytes)
}
