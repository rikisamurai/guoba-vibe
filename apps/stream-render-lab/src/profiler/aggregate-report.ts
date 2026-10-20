import type {
  AbProfileConfig,
  AbProfileReport,
  ProfileAggregate,
  ProfileRunSample,
  ProfileRole,
} from './ab-types'
import { resolveProfile } from './profile-options'
import { variability } from './profile-statistics'

export function aggregateReport(
  runs: readonly ProfileRunSample[],
  config: AbProfileConfig,
): AbProfileReport {
  return {
    baseline: aggregateProfile(runs, 'baseline', config),
    challenger: aggregateProfile(runs, 'challenger', config),
    runs,
    correctRuns: runs.filter((run) => Object.values(run.correctness).every(Boolean)).length,
  }
}

function aggregateProfile(
  runs: readonly ProfileRunSample[],
  role: ProfileRole,
  config: AbProfileConfig,
): ProfileAggregate {
  const selected = runs.filter((run) => run.role === role)
  const variation = variability(selected.map((run) => run.reactDurationMs))
  const firstVisible = selected.flatMap((run) =>
    run.firstVisibleMs === null ? [] : [run.firstVisibleMs],
  )
  return {
    profile: config[role],
    resolvedProfile: selected[0]?.resolvedProfile ?? resolveProfile(config[role]),
    firstVisibleMs: firstVisible.length ? mean(firstVisible) : null,
    heavyJobs: mean(selected.map((run) => run.snapshot.heavyMetrics.attempts)),
    commits: mean(selected.map((run) => run.snapshot.metrics.commits)),
    parseWork: mean(selected.map((run) => run.snapshot.metrics.previewParsedCodeUnits)),
    rawToVisibleP95Ms: mean(selected.map((run) => run.snapshot.metrics.rawToVisibleP95Ms)),
    reactDurationP95Ms: percentile(
      selected.map((run) => run.reactDurationMs).toSorted((left, right) => left - right),
      0.95,
    ),
    longTasks: selected.reduce((total, run) => total + run.longTasks, 0),
    longTasksSupported: selected.length > 0 && selected.every((run) => run.longTasksSupported),
    cvPercent: variation.cvPercent,
  }
}

function mean(values: readonly number[]): number {
  if (values.length === 0) return 0
  return values.reduce((total, value) => total + value, 0) / values.length
}

function percentile(sorted: readonly number[], ratio: number): number {
  if (sorted.length === 0) return 0
  return sorted[Math.max(0, Math.ceil(sorted.length * ratio) - 1)] ?? 0
}
