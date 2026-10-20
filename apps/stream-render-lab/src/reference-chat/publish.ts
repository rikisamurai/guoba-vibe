import type { FrameClock, Publisher } from '../practice/types'

export function createPublisher(show: (text: string) => void, clock: FrameClock): Publisher {
  let frame: number | undefined
  let latest: string | undefined
  const flush = () => {
    frame = undefined
    if (latest !== undefined) {
      const text = latest
      latest = undefined
      show(text)
    }
  }
  const cancel = () => {
    if (frame !== undefined) clock.cancel(frame)
    frame = undefined
  }
  return {
    push(text) {
      latest = text
      frame ??= clock.request(flush)
    },
    finish() {
      cancel()
      flush()
    },
    cancel() {
      cancel()
      latest = undefined
    },
  }
}
