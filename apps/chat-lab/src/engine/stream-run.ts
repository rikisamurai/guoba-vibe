import type { TokenSource } from '../types/stream'
import type { Scheduler } from './scheduler'

/**
 * Drives one assistant reply: pumps TokenSource events into the scheduler.
 * If the iterator ends without a terminal event (source was aborted), the
 * scheduler is told to snapshot as cancelled.
 */
export async function runStream(source: TokenSource, scheduler: Scheduler): Promise<void> {
  let terminal = false
  try {
    for await (const event of source.events) {
      if (event.type === 'delta') {
        scheduler.onDelta(event.text)
      } else if (event.type === 'done') {
        terminal = true
        scheduler.onDone(event.finishReason)
      } else {
        terminal = true
        scheduler.onError(event.message)
      }
    }
  } catch (error) {
    terminal = true
    scheduler.onError(error instanceof Error ? error.message : String(error))
  } finally {
    if (!terminal) scheduler.onAbort()
    scheduler.dispose()
  }
}
