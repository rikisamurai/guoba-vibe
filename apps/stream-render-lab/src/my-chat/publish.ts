import type { FrameClock, Publisher } from '../practice/types'

// C1: Start with immediate publication. Coalesce updates using the injected frame clock.
export function createPublisher(show: (text: string) => void, _clock: FrameClock): Publisher {
  return { push: show, finish() {}, cancel() {} }
}
