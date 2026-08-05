/**
 * Per-run metrics, fed by the instrumented scheduler, the block splitter and
 * a React Profiler around the streaming message. The collector is plain
 * mutable state — the panel polls snapshot() at its own low rate instead of
 * being notified per commit, so measuring never adds render pressure.
 */
export interface MetricsSnapshot {
  runLabel: string
  commitCount: number
  commitsPerSec: number
  rawToVisibleMs: { p50: number; p95: number } | null
  renderMs: { last: number; p95: number } | null
  tailParseMs: { last: number; p95: number } | null
  blockCount: number | null
  stableRatio: number | null
}

const WINDOW_MS = 2000
const MAX_SAMPLES = 2048

function quantile(samples: number[], q: number): number {
  const sorted = samples.toSorted((a, b) => a - b)
  const index = Math.min(sorted.length - 1, Math.ceil(q * sorted.length) - 1)
  return sorted[Math.max(0, index)]
}

function push(samples: number[], value: number): void {
  samples.push(value)
  if (samples.length > MAX_SAMPLES) samples.shift()
}

export interface MetricsCollector {
  reset(runLabel: string): void
  onDelta(charCount: number): void
  onCommit(visibleLength: number): void
  onRender(durationMs: number): void
  onSplit(tailParseMs: number, stableCount: number, blockCount: number): void
  snapshot(): MetricsSnapshot
}

export function createMetrics(now: () => number = () => performance.now()): MetricsCollector {
  let runLabel = ''
  let commitCount = 0
  let commitTimes: number[] = []
  let rawEnd = 0
  let pendingDeltas: Array<{ end: number; at: number }> = []
  let rawToVisible: number[] = []
  let renders: number[] = []
  let tailParses: number[] = []
  let blockCount: number | null = null
  let stableCount = 0

  return {
    reset(label) {
      runLabel = label
      commitCount = 0
      commitTimes = []
      rawEnd = 0
      pendingDeltas = []
      rawToVisible = []
      renders = []
      tailParses = []
      blockCount = null
      stableCount = 0
    },
    onDelta(charCount) {
      rawEnd += charCount
      pendingDeltas.push({ end: rawEnd, at: now() })
    },
    onCommit(visibleLength) {
      const at = now()
      commitCount += 1
      commitTimes.push(at)
      while (pendingDeltas.length > 0 && pendingDeltas[0].end <= visibleLength) {
        push(rawToVisible, at - pendingDeltas[0].at)
        pendingDeltas.shift()
      }
    },
    onRender(durationMs) {
      push(renders, durationMs)
    },
    onSplit(tailParseMs, stable, blocks) {
      push(tailParses, tailParseMs)
      stableCount = stable
      blockCount = blocks
    },
    snapshot() {
      const at = now()
      commitTimes = commitTimes.filter((time) => at - time <= WINDOW_MS)
      return {
        runLabel,
        commitCount,
        commitsPerSec: commitTimes.length / (WINDOW_MS / 1000),
        rawToVisibleMs:
          rawToVisible.length === 0
            ? null
            : { p50: quantile(rawToVisible, 0.5), p95: quantile(rawToVisible, 0.95) },
        renderMs:
          renders.length === 0
            ? null
            : { last: renders[renders.length - 1], p95: quantile(renders, 0.95) },
        tailParseMs:
          tailParses.length === 0
            ? null
            : { last: tailParses[tailParses.length - 1], p95: quantile(tailParses, 0.95) },
        blockCount,
        stableRatio: blockCount === null || blockCount === 0 ? null : stableCount / blockCount,
      }
    },
  }
}

/** Shared collector for the single active run. */
export const metrics: MetricsCollector = createMetrics()
