import type { StreamSource } from '../engine/types'
import { adaptProtocolStream } from '../protocol/protocol-stream'
import type { SseEvent } from '../protocol/sse'
import type { SourceEvent } from '../protocol/types'

export interface GuideSourceObserver {
  onStreamChunk?(): void
  onSseEvent?(event: SseEvent): void
  onSourceEvent?(event: SourceEvent): void
}

export interface GuideProtocolSource {
  source: StreamSource
  push(bytes: Uint8Array): Promise<void>
  enqueue(bytes: Uint8Array): void
  close(): void
}

export function createGuideProtocolSource(observer: GuideSourceObserver = {}): GuideProtocolSource {
  const stream = new PushByteStream(() => observer.onStreamChunk?.())
  return {
    source: {
      async *open(signal) {
        const events = adaptProtocolStream('chat-completions', stream.open(signal), {
          onDispatch: (event) => observer.onSseEvent?.(event),
        })
        for await (const event of events) {
          observer.onSourceEvent?.(event)
          yield event
        }
      },
    },
    push: (bytes) => stream.push(bytes),
    enqueue: (bytes) => stream.enqueue(bytes),
    close: () => stream.close(),
  }
}

class PushByteStream {
  private readonly values: Uint8Array[] = []
  private readonly processedWaiters: Array<() => void> = []
  private wake: (() => void) | null = null
  private closed = false
  private processed = 0

  constructor(private readonly onRead: (() => void) | undefined) {}

  async push(bytes: Uint8Array): Promise<void> {
    const target = this.processed + this.values.length + 1
    this.enqueue(bytes)
    if (this.processed >= target) return
    await new Promise<void>((resolve) => {
      this.processedWaiters[target] = resolve
    })
  }

  enqueue(bytes: Uint8Array): void {
    this.values.push(bytes)
    this.release()
  }

  close(): void {
    this.closed = true
    this.release()
    this.processedWaiters.splice(0).forEach((resolve) => resolve?.())
  }

  async *open(signal: AbortSignal): AsyncGenerator<Uint8Array> {
    while (!signal.aborted) {
      const value = this.values.shift()
      if (value) {
        this.onRead?.()
        yield value
        this.processed += 1
        this.processedWaiters[this.processed]?.()
        this.processedWaiters[this.processed] = () => undefined
      } else if (this.closed) return
      else {
        // oxlint-disable-next-line no-await-in-loop -- a stream read waits for its next chunk
        await new Promise<void>((resolve) => {
          this.wake = resolve
        })
      }
    }
  }

  private release(): void {
    this.wake?.()
    this.wake = null
  }
}
