export interface SseMessageEvent {
  event?: string
  data: string
  id?: string
}

export interface SseRetryControl {
  control: 'retry'
  retry: number
}

export type SseEvent = SseMessageEvent | SseRetryControl

export function isSseRetryControl(event: SseEvent): event is SseRetryControl {
  return 'control' in event
}

interface EventState {
  data: string[]
  eventType: string
  lastEventId: string
  hasLastEventId: boolean
}

export async function* parseSse(chunks: AsyncIterable<Uint8Array>): AsyncGenerator<SseEvent> {
  const decoder = new TextDecoder('utf-8')
  const state: EventState = {
    data: [],
    eventType: '',
    lastEventId: '',
    hasLastEventId: false,
  }
  let text = ''

  for await (const chunk of chunks) {
    text += decoder.decode(chunk, { stream: true })
    const drained = drainLines(text, false)
    text = drained.rest
    for (const line of drained.lines) {
      const event = processLine(line, state)
      if (event) yield event
    }
  }

  text += decoder.decode()
  const drained = drainLines(text, true)
  for (const line of drained.lines) {
    const event = processLine(line, state)
    if (event) yield event
  }
  // The event-stream algorithm discards pending data at EOF. A terminal
  // protocol marker must therefore have been dispatched by an empty line.
}

function drainLines(input: string, eof: boolean): { lines: string[]; rest: string } {
  const lines: string[] = []
  let start = 0
  let index = 0
  while (index < input.length) {
    const character = input[index]
    if (character === '\n') {
      lines.push(input.slice(start, index))
      start = index + 1
      index += 1
      continue
    }
    if (character === '\r') {
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

function processLine(line: string, state: EventState): SseEvent | undefined {
  if (line === '') return dispatch(state)
  if (line.startsWith(':')) return undefined

  const colon = line.indexOf(':')
  const field = colon === -1 ? line : line.slice(0, colon)
  let value = colon === -1 ? '' : line.slice(colon + 1)
  if (value.startsWith(' ')) value = value.slice(1)

  if (field === 'data') state.data.push(value)
  if (field === 'event') state.eventType = value
  if (field === 'id' && !value.includes('\0')) {
    state.lastEventId = value
    state.hasLastEventId = true
  }
  if (field === 'retry' && /^[0-9]+$/.test(value)) {
    return { control: 'retry', retry: Number(value) }
  }
  return undefined
}

function dispatch(state: EventState): SseEvent | undefined {
  if (state.data.length === 0) return undefined

  const event: SseMessageEvent = { data: state.data.join('\n') }
  if (state.eventType) event.event = state.eventType
  if (state.hasLastEventId) event.id = state.lastEventId
  state.data = []
  state.eventType = ''
  return event
}
