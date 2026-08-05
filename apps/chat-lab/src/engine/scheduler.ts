import type { MessagePhase } from '../types/message'

/**
 * The display clock. Deltas append to an internal raw buffer (ingest clock);
 * commits decide when the UI sees a longer prefix (display clock).
 *
 * M0 uses 'immediate': every delta commits — deliberately the worst case.
 * 'throttled' merges deltas on a fixed cadence (M1+).
 */
export type CommitPolicy = 'immediate' | 'throttled'

export interface SchedulerConfig {
  policy: CommitPolicy
  throttleMs?: number
  /** Injectable clock for tests. */
  now?: () => number
}

export interface CommitFrame {
  text: string
  phase: MessagePhase
  commitIndex: number
  error?: string
}

export interface Scheduler {
  onDelta(text: string): void
  onDone(finishReason?: string): void
  onError(message: string): void
  onAbort(): void
  dispose(): void
}

export function createScheduler(
  config: SchedulerConfig,
  emit: (frame: CommitFrame) => void,
): Scheduler {
  const throttleMs = config.throttleMs ?? 48
  const now = config.now ?? (() => performance.now())
  let raw = ''
  let commitIndex = 0
  let lastCommitAt = -Infinity
  let timer: ReturnType<typeof setTimeout> | null = null
  let closed = false

  function commit(phase: MessagePhase, error?: string): void {
    commitIndex += 1
    emit({ text: raw, phase, commitIndex, ...(error === undefined ? {} : { error }) })
  }

  function clearTimer(): void {
    if (timer !== null) {
      clearTimeout(timer)
      timer = null
    }
  }

  function commitStreaming(): void {
    clearTimer()
    lastCommitAt = now()
    commit('streaming')
  }

  return {
    onDelta(text) {
      if (closed) return
      raw += text
      if (config.policy === 'immediate') {
        commitStreaming()
        return
      }
      const elapsed = now() - lastCommitAt
      if (elapsed >= throttleMs) {
        commitStreaming()
      } else if (timer === null) {
        timer = setTimeout(commitStreaming, throttleMs - elapsed)
      }
    },
    onDone() {
      if (closed) return
      closed = true
      clearTimer()
      commit('final')
    },
    onError(message) {
      if (closed) return
      closed = true
      clearTimer()
      commit('error', message)
    },
    onAbort() {
      if (closed) return
      closed = true
      clearTimer()
      commit('cancelled')
    },
    dispose: clearTimer,
  }
}
