import type { EngineClock } from '../engine/clock'

export class AsyncQueue<T> {
  private values: Array<{ value: T }> = []
  private waiting: (() => void) | null = null
  private closed = false
  private failure: unknown

  push(value: T): void {
    this.values.push({ value })
    this.release()
  }

  close(): void {
    this.closed = true
    this.release()
  }

  fail(error: unknown): void {
    this.failure = error
    this.closed = true
    this.release()
  }

  async *open(signal: AbortSignal): AsyncGenerator<T> {
    while (!signal.aborted) {
      const item = this.values.shift()
      if (item) yield item.value
      else if (this.closed) {
        if (this.failure) throw this.failure
        return
      } else {
        // oxlint-disable-next-line no-await-in-loop -- a queue consumer waits for the next ordered item
        await new Promise<void>((resolve) => {
          this.waiting = resolve
        })
      }
    }
  }

  private release(): void {
    this.waiting?.()
    this.waiting = null
  }
}

export function waitForDelay(
  clock: EngineClock,
  delayMs: number,
  signal: AbortSignal,
): Promise<void> {
  if (signal.aborted) return Promise.resolve()
  return new Promise((resolve) => {
    const cancel = clock.after(delayMs, done)
    function done() {
      signal.removeEventListener('abort', abort)
      resolve()
    }
    function abort() {
      cancel()
      done()
    }
    signal.addEventListener('abort', abort, { once: true })
  })
}

export async function* readableStreamIterable(
  chunks: AsyncIterable<Uint8Array>,
  signal: AbortSignal,
): AsyncGenerator<Uint8Array> {
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        for await (const chunk of chunks) controller.enqueue(chunk)
        controller.close()
      } catch (error) {
        controller.error(error)
      }
    },
  })
  const reader = stream.getReader()
  try {
    while (!signal.aborted) {
      // oxlint-disable-next-line no-await-in-loop -- ReadableStream chunks are consumed in wire order
      const { done, value } = await reader.read()
      if (done) return
      yield value
    }
  } finally {
    reader.releaseLock()
  }
}
