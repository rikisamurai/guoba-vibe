import type { MessagePhase } from '../types/message'
import { floorGraphemeBoundary, nextGraphemeBoundary } from './grapheme'

/**
 * The display clock. Deltas append to an internal raw buffer (ingest clock);
 * commits decide how much the UI sees (display clock).
 *
 * - 'immediate' (M0): every delta commits the whole prefix — the worst case.
 * - 'throttled' (M1+): commits merge on a fixed cadence.
 * - smoothing: the visible cursor advances at revealCps instead of jumping to
 *   the raw end; after the source finishes the phase turns 'draining' until
 *   the cursor catches up. Cursor cuts always land on grapheme boundaries.
 */
export type CommitPolicy = 'immediate' | 'throttled'

export interface SchedulerConfig {
  policy: CommitPolicy
  throttleMs?: number
  smoothing?: boolean
  /** Reveal speed in characters per second while smoothing. */
  revealCps?: number
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
  const smoothing = config.smoothing ?? false
  const revealCps = config.revealCps ?? 400
  const now = config.now ?? (() => performance.now())

  let raw = ''
  let cursor = 0
  let commitIndex = 0
  let sourceDone = false
  let closed = false
  let lastCommitAt = -Infinity
  let timer: ReturnType<typeof setTimeout> | null = null

  function clearTimer(): void {
    if (timer !== null) {
      clearTimeout(timer)
      timer = null
    }
  }

  function emitFrame(phase: MessagePhase, error?: string): void {
    commitIndex += 1
    emit({
      text: raw.slice(0, cursor),
      phase,
      commitIndex,
      ...(error === undefined ? {} : { error }),
    })
  }

  function advanceCursor(elapsedMs: number): void {
    if (!smoothing || config.policy === 'immediate') {
      cursor = raw.length
      return
    }
    const budget = Math.max(8, Math.round((revealCps * elapsedMs) / 1000))
    const target = floorGraphemeBoundary(raw, Math.min(raw.length, cursor + budget))
    cursor = target > cursor ? target : nextGraphemeBoundary(raw, cursor)
  }

  function tick(): void {
    if (closed) return
    clearTimer()
    const at = now()
    advanceCursor(at - (lastCommitAt === -Infinity ? at - throttleMs : lastCommitAt))
    lastCommitAt = at
    const caughtUp = cursor >= raw.length
    if (sourceDone && caughtUp) {
      closed = true
      emitFrame('final')
      return
    }
    emitFrame(sourceDone ? 'draining' : 'streaming')
    if (!caughtUp) timer = setTimeout(tick, throttleMs)
  }

  function scheduleTick(): void {
    const elapsed = now() - lastCommitAt
    if (elapsed >= throttleMs) tick()
    else if (timer === null) timer = setTimeout(tick, throttleMs - elapsed)
  }

  return {
    onDelta(text) {
      if (closed || sourceDone) return
      raw += text
      if (config.policy === 'immediate') tick()
      else scheduleTick()
    },
    onDone() {
      if (closed || sourceDone) return
      sourceDone = true
      if (smoothing && cursor < raw.length) {
        scheduleTick()
        return
      }
      clearTimer()
      cursor = raw.length
      closed = true
      emitFrame('final')
    },
    onError(message) {
      if (closed) return
      closed = true
      clearTimer()
      cursor = raw.length
      emitFrame('error', message)
    },
    onAbort() {
      if (closed) return
      closed = true
      clearTimer()
      cursor = raw.length
      // A stop during draining loses nothing — the full text already arrived.
      emitFrame(sourceDone ? 'final' : 'cancelled')
    },
    dispose: clearTimer,
  }
}
