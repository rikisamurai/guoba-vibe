import type { HeavyMetrics } from '../heavy/types'
import type { RunMetrics } from './types'

export const EMPTY_RUN_METRICS: RunMetrics = {
  internalEvents: 0,
  commits: 0,
  previewParsePasses: 0,
  previewParsedCodeUnits: 0,
  canonicalParsePasses: 0,
  previewParseDurationMs: 0,
  canonicalParseDurationMs: 0,
  fullFallbacks: 0,
  backlogCodeUnits: 0,
  rawToVisibleSamples: 0,
  rawToVisibleP50Ms: 0,
  rawToVisibleP95Ms: 0,
}

export const EMPTY_HEAVY_METRICS: HeavyMetrics = {
  attempts: 0,
  completed: 0,
  failed: 0,
  pending: 0,
  shikiEnqueuedCodeUnits: 0,
  durationMs: 0,
}

export function percentile(sorted: readonly number[], ratio: number): number {
  if (sorted.length === 0) return 0
  const index = Math.max(0, Math.ceil(sorted.length * ratio) - 1)
  return sorted[index] ?? 0
}
