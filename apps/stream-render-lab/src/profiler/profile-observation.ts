import type { ProfileTimelineSample } from './ab-types'

interface RenderObservation {
  commits: Array<{ at: number; duration: number }>
  startedAt: number
}

export function appendRenderTimeline(
  timeline: ProfileTimelineSample[],
  active: RenderObservation,
  longTasks: PerformanceEntry[],
): void {
  timeline.push(
    ...active.commits.map((item) => ({
      layer: 'react' as const,
      label: 'React actualDuration',
      startMs: item.at,
      durationMs: item.duration,
    })),
  )
  timeline.push(
    ...longTasks.map((entry) => ({
      layer: 'long-task' as const,
      label: entry.name,
      startMs: Math.max(0, entry.startTime - active.startedAt),
      durationMs: entry.duration,
    })),
  )
}

export interface EngineTimingCursor {
  previewParseMs: number
  canonicalParseMs: number
  heavyMs: number
}

interface EngineTimingReading extends EngineTimingCursor {
  observedAtMs: number
}

export function createEngineTimingCursor(): EngineTimingCursor {
  return { previewParseMs: 0, canonicalParseMs: 0, heavyMs: 0 }
}

export function appendEngineTiming(
  timeline: ProfileTimelineSample[],
  cursor: EngineTimingCursor,
  reading: EngineTimingReading,
): void {
  appendDuration(
    timeline,
    'parse',
    'preview parse',
    reading.observedAtMs,
    reading.previewParseMs - cursor.previewParseMs,
  )
  appendDuration(
    timeline,
    'parse',
    'canonical parse',
    reading.observedAtMs,
    reading.canonicalParseMs - cursor.canonicalParseMs,
  )
  appendDuration(
    timeline,
    'heavy',
    'heavy jobs',
    reading.observedAtMs,
    reading.heavyMs - cursor.heavyMs,
  )
  cursor.previewParseMs = reading.previewParseMs
  cursor.canonicalParseMs = reading.canonicalParseMs
  cursor.heavyMs = reading.heavyMs
}

function appendDuration(
  timeline: ProfileTimelineSample[],
  layer: 'parse' | 'heavy',
  label: string,
  observedAtMs: number,
  durationMs: number,
): void {
  if (durationMs <= 0) return
  timeline.push({
    layer,
    label,
    startMs: Math.max(0, observedAtMs - durationMs),
    durationMs,
  })
}

export interface LongTaskObservation {
  entries: PerformanceEntry[]
  stop: () => void
  supported: boolean
}

export function observeLongTasks(startedAt: number): LongTaskObservation {
  const entries: PerformanceEntry[] = []
  if (
    typeof PerformanceObserver === 'undefined' ||
    !PerformanceObserver.supportedEntryTypes?.includes('longtask')
  ) {
    return { entries, supported: false, stop() {} }
  }
  const observer = new PerformanceObserver((list) => {
    entries.push(...list.getEntries().filter((entry) => entry.startTime >= startedAt))
  })
  observer.observe({ type: 'longtask', buffered: false })
  return {
    entries,
    supported: true,
    stop() {
      entries.push(...observer.takeRecords())
      observer.disconnect()
    },
  }
}
