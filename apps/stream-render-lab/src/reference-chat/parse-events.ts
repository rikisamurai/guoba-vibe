import type { EventParser } from '../practice/types'

// This teaching contract exposes SSE data only; id/retry/reconnection belong to the full adapter.
export function createEventParser(): EventParser {
  let pending = ''
  let data: string[] = []
  const drain = (eof: boolean) => {
    const events: string[] = []
    let start = 0
    let index = 0
    while (index < pending.length) {
      const char = pending[index]
      if (char !== '\r' && char !== '\n') {
        index++
        continue
      }
      if (char === '\r' && index + 1 === pending.length && !eof) break
      const line = pending.slice(start, index)
      index += char === '\r' && pending[index + 1] === '\n' ? 2 : 1
      start = index
      if (line === '') {
        if (data.length) events.push(data.join('\n'))
        data = []
      } else {
        const colon = line.indexOf(':')
        const field = colon < 0 ? line : line.slice(0, colon)
        const value = colon < 0 ? '' : line.slice(colon + 1).replace(/^ /, '')
        if (field === 'data') data.push(value)
      }
    }
    pending = pending.slice(start)
    return events
  }
  return {
    push(text) {
      pending += text
      return drain(false)
    },
    finish() {
      const events = drain(true)
      pending = ''
      data = []
      return events
    },
  }
}
