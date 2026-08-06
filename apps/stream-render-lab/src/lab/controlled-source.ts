import type { EngineClock } from '../engine/clock'
import type { StreamSource } from '../engine/types'
import { adaptProtocolStream } from '../protocol/protocol-stream'
import type { SseEvent } from '../protocol/sse'
import type { SourceEvent } from '../protocol/types'
import type { Utf8ChunkObservation } from '../protocol/utf8'
import { AsyncQueue, readableStreamIterable, waitForDelay } from './async-stream'
import type { LabPlaybackStatus, LabTransport, WireChunkRecord } from './types'
import type { WireChunk } from './wire'

interface SessionObserver {
  onStatus(status: LabPlaybackStatus): void
  onProgress(current: number, total: number): void
  onWire(record: WireChunkRecord): void
  onDecoded(record: Utf8ChunkObservation): void
  onLine(line: string): void
  onSse(event: SseEvent): void
  onEvent(event: SourceEvent): void
}

export class ControlledWireSession {
  private readonly queues: Array<AsyncQueue<SourceEvent>> = []
  private readonly abortController = new AbortController()
  private readonly gate = new PlaybackGate()

  constructor(
    private readonly clock: EngineClock,
    private readonly chunks: readonly WireChunk[],
    private readonly transport: LabTransport,
    private readonly observer: SessionObserver,
  ) {}

  createSource(): StreamSource {
    const queue = new AsyncQueue<SourceEvent>()
    this.queues.push(queue)
    return { open: (signal) => queue.open(signal) }
  }

  async start(): Promise<void> {
    this.observer.onStatus('running')
    const scheduled = this.scheduledChunks()
    const bytes =
      this.transport === 'readable-stream'
        ? readableStreamIterable(scheduled, this.abortController.signal)
        : scheduled
    try {
      const events = adaptProtocolStream('chat-completions', bytes, {
        onChunk: (record) => this.observer.onDecoded(record),
        onLine: ({ line }) => this.observer.onLine(line),
        onDispatch: (event) => this.observer.onSse(event),
      })
      for await (const event of events) {
        this.observer.onEvent(event)
        this.queues.forEach((queue) => queue.push(event))
      }
      this.queues.forEach((queue) => queue.close())
    } catch (error) {
      if (!this.abortController.signal.aborted) {
        this.queues.forEach((queue) => queue.fail(error))
      }
    }
  }

  pause(): void {
    this.gate.pause()
    this.observer.onStatus('paused')
  }

  resume(): void {
    this.gate.resume()
    this.observer.onStatus('running')
  }

  step(): void {
    this.gate.step()
    this.observer.onStatus('paused')
  }

  cancel(): void {
    this.abortController.abort()
    this.gate.cancel()
    this.queues.forEach((queue) => queue.close())
  }

  private async *scheduledChunks(): AsyncGenerator<Uint8Array> {
    const signal = this.abortController.signal
    for (const chunk of this.chunks) {
      // oxlint-disable-next-line no-await-in-loop -- transport preserves configured chunk cadence
      await waitForDelay(this.clock, chunk.delayMs, signal)
      // oxlint-disable-next-line no-await-in-loop -- pause and step gate each chunk in source order
      await this.gate.wait(signal)
      if (signal.aborted) return
      this.observer.onWire(chunk)
      this.observer.onProgress(chunk.index + 1, this.chunks.length)
      yield chunk.bytes
    }
  }
}

class PlaybackGate {
  private running = true
  private stepBudget = 0
  private wake: (() => void) | null = null

  pause(): void {
    this.running = false
  }

  resume(): void {
    this.running = true
    this.release()
  }

  step(): void {
    this.running = false
    this.stepBudget += 1
    this.release()
  }

  cancel(): void {
    this.release()
  }

  async wait(signal: AbortSignal): Promise<void> {
    while (!signal.aborted && !this.running && this.stepBudget === 0) {
      // oxlint-disable-next-line no-await-in-loop -- gate must remain blocked until one control action
      await new Promise<void>((resolve) => {
        this.wake = resolve
      })
    }
    if (!this.running && this.stepBudget > 0) this.stepBudget -= 1
  }

  private release(): void {
    this.wake?.()
    this.wake = null
  }
}
