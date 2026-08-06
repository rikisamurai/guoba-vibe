import type { SseEvent, SseMessageEvent } from '../../../src/protocol/sse'
import type {
  LessonUtf8Decoder,
  LineDrainResult,
  ParsedSseField,
  SseImplementation,
} from '../contract'

interface EventState {
  data: string[]
  eventType: string
  lastEventId: string
  hasLastEventId: boolean
}

export const parseLessonSse: SseImplementation = async (chunks) => {
  const decoder = createLessonDecoder()
  const state: EventState = { data: [], eventType: '', lastEventId: '', hasLastEventId: false }
  const events: SseEvent[] = []
  let pending = ''

  for await (const chunk of chunks) {
    pending += decoder.push(chunk)
    const drained = drainLessonLines(pending, false)
    pending = drained.rest
    for (const line of drained.lines) processLine(line, state, events)
  }

  pending += decoder.finish()
  const drained = drainLessonLines(pending, true)
  for (const line of drained.lines) processLine(line, state, events)
  // WHATWG SSE discards a residual line and pending data at EOF.
  return events
}

export function createLessonDecoder(): LessonUtf8Decoder {
  const decoder = new TextDecoder('utf-8')
  return {
    push: (chunk) => decoder.decode(chunk, { stream: true }),
    finish: () => decoder.decode(),
  }
}

export function drainLessonLines(input: string, eof: boolean): LineDrainResult {
  const lines: string[] = []
  let start = 0
  let index = 0
  while (index < input.length) {
    if (input[index] === '\n') {
      lines.push(input.slice(start, index))
      start = index + 1
      index += 1
      continue
    }
    if (input[index] === '\r') {
      if (index + 1 === input.length && !eof) break
      lines.push(input.slice(start, index))
      index += input[index + 1] === '\n' ? 2 : 1
      start = index
      continue
    }
    index += 1
  }
  return { lines, rest: input.slice(start) }
}

function processLine(line: string, state: EventState, events: SseEvent[]): void {
  if (line === '') {
    const event = dispatch(state)
    if (event) events.push(event)
    return
  }
  const parsed = parseLessonField(line)
  if (!parsed) return
  const { name: field, value } = parsed

  if (field === 'data') state.data.push(value)
  if (field === 'event') state.eventType = value
  if (field === 'id' && !value.includes('\0')) {
    state.lastEventId = value
    state.hasLastEventId = true
  }
  if (field === 'retry' && /^[0-9]+$/.test(value)) {
    events.push({ control: 'retry', retry: Number(value) })
  }
}

export function parseLessonField(line: string): ParsedSseField | undefined {
  if (line.startsWith(':')) return undefined
  const colon = line.indexOf(':')
  const name = colon === -1 ? line : line.slice(0, colon)
  let value = colon === -1 ? '' : line.slice(colon + 1)
  if (value.startsWith(' ')) value = value.slice(1)
  return { name, value }
}

function dispatch(state: EventState): SseMessageEvent | undefined {
  if (state.data.length === 0) return undefined
  const event: SseMessageEvent = { data: state.data.join('\n') }
  if (state.eventType) event.event = state.eventType
  if (state.hasLastEventId) event.id = state.lastEventId
  state.data = []
  state.eventType = ''
  return event
}
