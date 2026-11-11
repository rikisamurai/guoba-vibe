import type { Cancel, EngineClock } from '../engine/clock'

export interface AdaptiveFrameScheduler {
  /** Runs short cooperative tasks in FIFO order and checks yield conditions between them. */
  schedule(task: () => void): Cancel
}

export interface HostSchedulingCapabilities {
  postTask?: (task: () => void) => Cancel
  isInputPending?: () => boolean
}

export interface AdaptiveFrameSchedulerOptions {
  clock: EngineClock
  frameBudgetMs?: number
  capabilities?: HostSchedulingCapabilities
}

interface QueuedTask {
  task: () => void
  cancelled: boolean
}

export function createAdaptiveFrameScheduler(
  options: AdaptiveFrameSchedulerOptions,
): AdaptiveFrameScheduler {
  const frameBudgetMs = options.frameBudgetMs ?? 8
  if (!Number.isFinite(frameBudgetMs) || frameBudgetMs <= 0) {
    throw new RangeError('Frame budget must be a positive finite number')
  }
  const queue: QueuedTask[] = []
  let cancelHostTask: Cancel | undefined
  let draining = false

  const requestHostTask = (task: () => void): Cancel =>
    options.capabilities?.postTask?.(task) ?? options.clock.frame(() => task())

  const drain = () => {
    cancelHostTask = undefined
    const startedAt = options.clock.now()
    draining = true
    try {
      while (queue.length > 0) {
        const entry = queue.shift()
        if (!entry || entry.cancelled) continue
        entry.task()
        const budgetSpent = options.clock.now() - startedAt >= frameBudgetMs
        const inputPending = options.capabilities?.isInputPending?.() ?? false
        if (budgetSpent || inputPending) break
      }
    } finally {
      draining = false
      for (let index = queue.length - 1; index >= 0; index -= 1) {
        if (queue[index]?.cancelled) queue.splice(index, 1)
      }
      if (queue.length > 0) cancelHostTask = requestHostTask(drain)
    }
  }

  return {
    schedule(task) {
      const entry = { task, cancelled: false }
      queue.push(entry)
      if (!draining) cancelHostTask ??= requestHostTask(drain)
      return () => {
        if (entry.cancelled) return
        entry.cancelled = true
        if (!draining && queue.every((candidate) => candidate.cancelled)) {
          queue.length = 0
          cancelHostTask?.()
          cancelHostTask = undefined
        }
      }
    },
  }
}
