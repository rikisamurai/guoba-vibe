import type { StreamEvent, TokenSource } from '../types/stream'
import type { ChunkPlan } from './profiles'

/**
 * Fake token source that replays a chunk plan on real timers. Bytes go through
 * a streaming TextDecoder, so deltas are always valid strings even when the
 * plan cuts inside a UTF-8 sequence — exactly like the real network path.
 */
export function createSimSource(plan: ChunkPlan[], speed = 1): TokenSource {
  let aborted = false
  let wake: (() => void) | null = null

  async function* generate(): AsyncGenerator<StreamEvent> {
    const decoder = new TextDecoder('utf-8')
    for (const chunk of plan) {
      if (aborted) return
      // oxlint-disable-next-line no-await-in-loop -- replay is inherently sequential
      await new Promise<void>((resolve) => {
        wake = resolve
        setTimeout(resolve, chunk.delayMs / speed)
      })
      wake = null
      if (aborted) return
      const text = decoder.decode(chunk.bytes, { stream: true })
      if (text !== '') yield { type: 'delta', text }
    }
    const tail = decoder.decode()
    if (tail !== '') yield { type: 'delta', text: tail }
    yield { type: 'done', finishReason: 'stop' }
  }

  return {
    events: generate(),
    abort() {
      aborted = true
      wake?.()
    },
  }
}
