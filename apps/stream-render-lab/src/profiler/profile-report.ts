import type { TraceEvent } from '../components/trace-timeline'
import type { RunMetrics } from '../engine/types'
import { browserHeapBytes, variability } from './profile-statistics'

export interface ReactRenderSample {
  at: number
  duration: number
}

export interface BrowserProfileReport {
  metrics: RunMetrics
  reactCommits: number
  reactRenderP95Ms: number
  reactTimingResolutionLimited: boolean
  repeatedRuns: number
  longTasks: number | null
  longTaskDurationMs: number | null
  events: TraceEvent[]
  heapBytes: number | null
  cvPercent: number | null
  rmePercent: number | null
}

interface ReportInput {
  metrics: RunMetrics
  allCommits: ReactRenderSample[]
  lastRunCommits: ReactRenderSample[]
  runRenderTotalsMs: number[]
  longTasks: PerformanceEntry[]
  longTaskSupported: boolean
}

export function buildBrowserProfileReport(input: ReportInput): BrowserProfileReport {
  const durations = input.allCommits
    .map(({ duration }) => duration)
    .toSorted((left, right) => left - right)
  const variation = variability(input.runRenderTotalsMs)
  const reactRenderP95Ms = percentile(durations, 0.95)
  return {
    metrics: input.metrics,
    reactCommits: input.allCommits.length,
    reactRenderP95Ms,
    reactTimingResolutionLimited: input.allCommits.length > 0 && reactRenderP95Ms === 0,
    repeatedRuns: input.runRenderTotalsMs.length,
    longTasks: input.longTaskSupported ? input.longTasks.length : null,
    longTaskDurationMs: input.longTaskSupported
      ? input.longTasks.reduce((total, entry) => total + entry.duration, 0)
      : null,
    heapBytes: browserHeapBytes(),
    ...variation,
    events: recentEvents(input.lastRunCommits),
  }
}

function recentEvents(commits: ReactRenderSample[]): TraceEvent[] {
  const recent = commits.slice(-4)
  return recent.map(({ at, duration }, index) => ({
    time: at.toFixed(1),
    kind: 'commit',
    title: `Profiler commit #${commits.length - recent.length + index + 1}`,
    detail: 'Production profiling build · actualDuration (render/reconcile)',
    cost: duration === 0 ? '<0.01 ms' : `${duration.toFixed(2)} ms`,
  }))
}

function percentile(sorted: number[], ratio: number): number {
  if (sorted.length === 0) return 0
  return sorted[Math.max(0, Math.ceil(sorted.length * ratio) - 1)] ?? 0
}
