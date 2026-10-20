import type { StreamSource } from '../engine/types'
import type { RunOutcome, SourceEvent, StreamEvent } from '../protocol/types'

// Bridge accepted learner text to the same rendering engine used by the profiler.
export function createTextSource() {
  const queue: StreamEvent[] = [
    { type: 'response.start', responseId: 'mini-chat' },
    { type: 'part.start', partId: 'answer', kind: 'answer' },
  ]
  let closed = false
  let wake: (() => void) | undefined
  function push(event: StreamEvent) {
    queue.push(event)
    wake?.()
    wake = undefined
  }
  const source: StreamSource = {
    async *open(signal) {
      const abort = () => {
        closed = true
        wake?.()
      }
      signal.addEventListener('abort', abort, { once: true })
      let ordinal = 0
      try {
        while (!signal.aborted) {
          if (queue.length) {
            const event = queue.shift()!
            const envelope: SourceEvent = {
              sourceEventOrdinal: ordinal++,
              splitIndex: 0,
              origin: { protocol: 'replay', recordIndex: ordinal },
              event,
            }
            yield envelope
          } else if (closed) return
          else {
            // oxlint-disable-next-line no-await-in-loop -- wait for the next accepted delta
            await new Promise<void>((resolve) => {
              wake = resolve
            })
          }
        }
      } finally {
        signal.removeEventListener('abort', abort)
        closed = true
      }
    },
  }
  return {
    source,
    append(text: string) {
      if (!closed && text)
        push({ type: 'part.delta', partId: 'answer', delta: { kind: 'text', text } })
    },
    end(outcome: RunOutcome) {
      if (closed) return
      push({ type: 'part.end', partId: 'answer' })
      push({ type: 'response.end', outcome })
      closed = true
    },
  }
}
