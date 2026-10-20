// Reference SSE parser for the embedded demos.
import { decodeUtf8Chunks } from './utf8'

export interface SseEvent {
  type: string
  data: string
  lastEventId: string
}

export interface ParsedEventStream {
  events: readonly SseEvent[]
  lastEventId: string
  retryMs?: number
}

const SSE_WIRE = [
  '\uFEFF: heartbeat\r\n',
  'id: 7\r\n',
  'retry: 1500\r',
  'event: token\n',
  'data: {"text":"你"}\r\n',
  'data: {"text":"好"}\r\n',
  '\r\n',
  '\uFEFFdata: ignored\n',
  'data: plain\n\n',
  'id: 99',
].join('')

const encoded = new TextEncoder().encode(SSE_WIRE)

export const SSE_FIXTURE_CHUNKS = Array.from(encoded, (byte) => Uint8Array.of(byte))

interface EventBuffer {
  data: string
  type: string
  lastEventId: string
  retryMs?: number
}

export function parseEventStream(chunks: readonly Uint8Array[]): ParsedEventStream {
  const events: SseEvent[] = []
  const buffer: EventBuffer = { data: '', type: '', lastEventId: '' }
  let firstLine = true

  for (const rawLine of completeLines(decodeUtf8Chunks(chunks))) {
    const line = firstLine && rawLine.startsWith('\uFEFF') ? rawLine.slice(1) : rawLine
    firstLine = false
    if (line === '') {
      dispatch(buffer, events)
      continue
    }
    if (line.startsWith(':')) continue
    applyField(line, buffer)
  }

  return {
    events,
    lastEventId: buffer.lastEventId,
    ...(buffer.retryMs === undefined ? {} : { retryMs: buffer.retryMs }),
  }
}

function completeLines(text: string): string[] {
  const lines: string[] = []
  const lineEnd = /\r\n|\r|\n/g
  let start = 0

  for (let match = lineEnd.exec(text); match; match = lineEnd.exec(text)) {
    lines.push(text.slice(start, match.index))
    start = match.index + match[0].length
  }

  return lines
}

function applyField(line: string, buffer: EventBuffer): void {
  const colon = line.indexOf(':')
  const field = colon === -1 ? line : line.slice(0, colon)
  const rawValue = colon === -1 ? '' : line.slice(colon + 1)
  const value = rawValue.startsWith(' ') ? rawValue.slice(1) : rawValue

  if (field === 'data') buffer.data += `${value}\n`
  if (field === 'event') buffer.type = value
  if (field === 'id' && !value.includes('\0')) buffer.lastEventId = value
  if (field === 'retry' && /^\d+$/.test(value)) buffer.retryMs = Number(value)
}

function dispatch(buffer: EventBuffer, events: SseEvent[]): void {
  if (buffer.data !== '') {
    events.push({
      type: buffer.type || 'message',
      data: buffer.data.slice(0, -1),
      lastEventId: buffer.lastEventId,
    })
  }
  buffer.data = ''
  buffer.type = ''
}
