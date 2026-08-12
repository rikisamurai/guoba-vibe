import type { MetricItem } from '../components/metric-grid'
import type { RenderSnapshot } from '../engine/types'
import type { BrowserProfileReport } from './profile-report'

export function profileMetrics(
  snapshot: RenderSnapshot | null,
  report: BrowserProfileReport | null,
): MetricItem[] {
  const metrics = snapshot?.metrics
  return [
    {
      label: 'RAW → VISIBLE P50',
      value: formatProfileMs(metrics?.rawToVisibleP50Ms),
      note: `${metrics?.rawToVisibleSamples ?? 0} accepted deltas`,
      tone: 'signal',
    },
    {
      label: 'RAW → VISIBLE P95',
      value: formatProfileMs(metrics?.rawToVisibleP95Ms),
      note: 'engine arrival samples',
      tone: 'signal',
    },
    {
      label: 'PARSE WORK',
      value: `${metrics?.previewParsedCodeUnits ?? 0}`,
      note: 'preview parsed code units',
    },
    {
      label: 'PARSE DURATION',
      value: formatProfileMs(
        (metrics?.previewParseDurationMs ?? 0) + (metrics?.canonicalParseDurationMs ?? 0),
      ),
      note: 'preview + canonical projection',
    },
    {
      label: 'HEAVY DURATION',
      value: formatProfileMs(snapshot?.heavyMetrics.durationMs),
      note: `${snapshot?.heavyMetrics.attempts ?? 0} Shiki / math / diagram attempts`,
    },
    {
      label: 'ENGINE COMMITS',
      value: `${metrics?.commits ?? 0}`,
      note: `${metrics?.canonicalParsePasses ?? 0} canonical pass`,
    },
    {
      label: 'REACT RENDER P95',
      value: formatMeasuredMs(
        report?.reactRenderP95Ms,
        report?.reactTimingResolutionLimited ?? false,
      ),
      note: `${report?.reactCommits ?? 0} commits / ${report?.repeatedRuns ?? 0} replays${report?.reactTimingResolutionLimited ? ' · timer resolution floor' : ''}`,
    },
    {
      label: 'LONG TASKS',
      value: report?.longTasks === null || report === null ? 'N/A' : `${report.longTasks}`,
      note:
        report?.longTaskDurationMs === null || report === null
          ? 'entry type unavailable'
          : `${formatProfileMs(report.longTaskDurationMs)} total`,
      tone: report?.longTasks ? 'warning' : undefined,
    },
    {
      label: 'JS HEAP',
      value: formatBytes(report?.heapBytes),
      note: report?.heapBytes === null ? 'memory API unavailable' : 'usedJSHeapSize capability',
    },
    {
      label: 'CV / RME95',
      value:
        report?.cvPercent === null || report === null
          ? 'N/A'
          : `${report.cvPercent.toFixed(1)}% / ${report.rmePercent?.toFixed(1)}%`,
      note: `${report?.repeatedRuns ?? 0} replay render totals`,
    },
  ]
}

export function formatProfileMs(value: number | undefined): string {
  if (value === undefined) return '—'
  return `${value.toFixed(2)} ms`
}

function formatMeasuredMs(value: number | undefined, resolutionLimited: boolean): string {
  if (resolutionLimited) return '<0.01 ms'
  return formatProfileMs(value)
}

function formatBytes(value: number | null | undefined): string {
  if (value === null || value === undefined) return 'N/A'
  return `${(value / 1024 / 1024).toFixed(1)} MB`
}
