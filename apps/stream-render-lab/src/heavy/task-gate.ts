import type { Cancel, EngineClock } from '../engine/clock'

export interface HeavyTask {
  runId: string
  blockId: string
  revision: number
  source: string
}

export interface HeavyTaskGate {
  push(task: HeavyTask): void
  flush(): Promise<void>
  dispose(): void
}

interface HeavyTaskGateOptions<T> {
  clock: EngineClock
  delayMs: number
  timeoutMs?: number
  render: (task: HeavyTask, signal: AbortSignal) => Promise<T>
  onCommit: (task: HeavyTask, output: T) => void
  onError?: (task: HeavyTask, error: unknown) => void
}

export class HeavyTaskTimeoutError extends Error {
  constructor(timeoutMs: number) {
    super(`Heavy task exceeded ${timeoutMs} ms`)
    this.name = 'HeavyTaskTimeoutError'
  }
}

function sameTask(left: HeavyTask | null, right: HeavyTask): boolean {
  return (
    left?.runId === right.runId &&
    left.blockId === right.blockId &&
    left.revision === right.revision &&
    left.source === right.source
  )
}

export function createHeavyTaskGate<T>(options: HeavyTaskGateOptions<T>): HeavyTaskGate {
  let latest: HeavyTask | null = null
  let handled: HeavyTask | null = null
  let active: Promise<void> | null = null
  let activeController: AbortController | null = null
  let cancelTimer: Cancel | null = null
  let disposed = false

  function renderWithDeadline(task: HeavyTask, controller: AbortController): Promise<T> {
    const timeoutMs = options.timeoutMs
    if (timeoutMs === undefined) return options.render(task, controller.signal)
    return new Promise<T>((resolve, reject) => {
      let done = false
      const finish = (complete: () => void) => {
        if (done) return
        done = true
        cancelDeadline()
        controller.signal.removeEventListener('abort', onAbort)
        complete()
      }
      const onAbort = () => finish(() => reject(new DOMException('Aborted', 'AbortError')))
      const cancelDeadline = options.clock.after(timeoutMs, () => {
        finish(() => reject(new HeavyTaskTimeoutError(timeoutMs)))
        controller.abort()
      })
      controller.signal.addEventListener('abort', onAbort, { once: true })
      void options.render(task, controller.signal).then(
        (output) => finish(() => resolve(output)),
        (error: unknown) => finish(() => reject(error)),
      )
    })
  }

  function clearTimer(): void {
    cancelTimer?.()
    cancelTimer = null
  }

  function startLatest(): Promise<void> {
    clearTimer()
    if (disposed || latest === null || sameTask(handled, latest)) {
      return Promise.resolve()
    }
    if (active !== null) return active

    const task = latest
    const controller = new AbortController()
    activeController = controller
    active = renderWithDeadline(task, controller)
      .then((output) => {
        if (!disposed && sameTask(latest, task)) {
          handled = task
          options.onCommit(task, output)
        }
      })
      .catch((error: unknown) => {
        const timedOut = error instanceof HeavyTaskTimeoutError
        if (!disposed && (!controller.signal.aborted || timedOut) && sameTask(latest, task)) {
          handled = task
          options.onError?.(task, error)
        }
      })
      .finally(() => {
        active = null
        activeController = null
        if (!disposed && latest !== null && !sameTask(handled, latest)) {
          clearTimer()
          cancelTimer = options.clock.after(options.delayMs, () => {
            void startLatest()
          })
        }
      })
    return active
  }

  async function flushLatest(): Promise<void> {
    if (disposed || latest === null || sameTask(handled, latest)) return
    await (active ?? startLatest())
    clearTimer()
    await flushLatest()
  }

  return {
    push(task) {
      if (disposed || sameTask(latest, task)) return
      latest = task
      clearTimer()
      if (active === null) {
        cancelTimer = options.clock.after(options.delayMs, () => {
          void startLatest()
        })
      }
    },
    async flush() {
      clearTimer()
      await flushLatest()
    },
    dispose() {
      if (disposed) return
      disposed = true
      clearTimer()
      activeController?.abort()
    },
  }
}
