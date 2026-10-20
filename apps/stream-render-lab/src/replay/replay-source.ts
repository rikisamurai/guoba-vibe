import type { EngineClock } from '../engine/clock'
import type { SourceEvent, StreamEvent } from '../protocol/types'

export interface TimedRecord<T> {
  at: number
  value: T
}

export interface ReplayRecord {
  at: number
  event: StreamEvent
}

export class TimedReplay<T> {
  private readonly records: ReadonlyArray<TimedRecord<T>>

  constructor(
    private readonly clock: EngineClock,
    records: ReadonlyArray<TimedRecord<T>>,
  ) {
    validateTimes(records.map(({ at }) => at))
    this.records = [...records]
  }

  async *open(signal: AbortSignal): AsyncGenerator<T> {
    if (signal.aborted) return
    const ready: T[] = []
    let aborted = false
    let wake: (() => void) | undefined
    const cancellations = this.records.map((record) =>
      this.clock.after(record.at, () => {
        ready.push(record.value)
        wake?.()
        wake = undefined
      }),
    )
    const onAbort = () => {
      aborted = true
      for (const cancel of cancellations) cancel()
      wake?.()
      wake = undefined
    }
    signal.addEventListener('abort', onAbort, { once: true })

    let delivered = 0
    try {
      while (delivered < this.records.length) {
        if (ready.length === 0) {
          // oxlint-disable-next-line no-await-in-loop -- replay waits for clock work in sequence
          await new Promise<void>((resolve) => {
            wake = resolve
          })
        }
        if (aborted) return
        const value = ready.shift()
        if (value === undefined) continue
        delivered += 1
        yield value
      }
    } finally {
      signal.removeEventListener('abort', onAbort)
      for (const cancel of cancellations) cancel()
    }
  }
}

export class ReplaySource {
  private readonly replay: TimedReplay<ReplayRecord>

  constructor(clock: EngineClock, records: ReadonlyArray<ReplayRecord>) {
    validateTimes(records.map(({ at }) => at))
    this.replay = new TimedReplay(
      clock,
      records.map((record) => ({
        at: record.at,
        value: record,
      })),
    )
  }

  async *open(signal: AbortSignal): AsyncGenerator<SourceEvent> {
    let recordIndex = 0
    for await (const record of this.replay.open(signal)) {
      yield {
        sourceEventOrdinal: recordIndex,
        splitIndex: 0,
        origin: { protocol: 'replay', recordIndex },
        event: record.event,
      }
      recordIndex += 1
    }
  }
}

function validateTimes(times: number[]): void {
  let previous = -1
  for (const at of times) {
    if (!Number.isFinite(at) || at < 0 || at < previous) {
      throw new RangeError('Replay offsets must be finite, non-negative, and ordered')
    }
    previous = at
  }
}
