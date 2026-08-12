import type { AbProfile, AbProfileReport, ProfileAggregate, ProfileRunSample } from './ab-types'
import { variability } from './profile-statistics'

export function aggregateReport(runs: readonly ProfileRunSample[]): AbProfileReport {
  return {
    baseline: aggregateProfile(runs, 'M0'),
    challenger: aggregateProfile(runs, 'M1'),
    runs,
  }
}

function aggregateProfile(runs: readonly ProfileRunSample[], profile: AbProfile): ProfileAggregate {
  const selected = runs.filter((run) => run.profile === profile)
  const variation = variability(selected.map((run) => run.reactDurationMs))
  return {
    profile,
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
