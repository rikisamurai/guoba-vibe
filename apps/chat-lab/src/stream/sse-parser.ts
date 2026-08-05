/**
 * Incremental server-sent-events parser.
 *
 * Feed raw network bytes with push(); complete events come back as they close.
 * Handles UTF-8 multi-byte sequences split across chunks (streaming TextDecoder),
 * half lines, CRLF, comment lines, and multi-line data fields.
 */
export interface SseEvent {
  data: string
}

export interface SseParser {
  push(chunk: Uint8Array): SseEvent[]
  /** Call once at end of stream to flush a final event that was never terminated. */
  flush(): SseEvent[]
}

export function createSseParser(): SseParser {
  const decoder = new TextDecoder('utf-8')
  let textBuffer = ''
  let dataLines: string[] = []

  function takeEvent(events: SseEvent[]): void {
    if (dataLines.length > 0) {
      events.push({ data: dataLines.join('\n') })
      dataLines = []
    }
  }

  function consumeLine(line: string, events: SseEvent[]): void {
    if (line === '') {
      takeEvent(events)
      return
    }
    if (line.startsWith(':')) return
    if (line.startsWith('data:')) {
      const value = line.slice(5)
      dataLines.push(value.startsWith(' ') ? value.slice(1) : value)
    }
    // Other fields (event:, id:, retry:) are irrelevant for chat completions.
  }

  return {
    push(chunk) {
      textBuffer += decoder.decode(chunk, { stream: true })
      const events: SseEvent[] = []
      for (;;) {
        const newline = textBuffer.indexOf('\n')
        if (newline === -1) break
        let line = textBuffer.slice(0, newline)
        textBuffer = textBuffer.slice(newline + 1)
        if (line.endsWith('\r')) line = line.slice(0, -1)
        consumeLine(line, events)
      }
      return events
    },
    flush() {
      textBuffer += decoder.decode()
      const events: SseEvent[] = []
      if (textBuffer !== '') {
        let line = textBuffer
        if (line.endsWith('\r')) line = line.slice(0, -1)
        textBuffer = ''
        consumeLine(line, events)
      }
      takeEvent(events)
      return events
    },
  }
}
