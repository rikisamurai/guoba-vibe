import { describe, expect, it } from 'vitest'

import type { ProfileRunSample } from './ab-types'
import { aggregateReport } from './aggregate-report'

describe('aggregateReport', () => {
  it('keeps M0 and M1 samples separate', () => {
    const report = aggregateReport([
      sample('M0', 12, 1200),
      sample('M1', 4, 400),
      sample('M1', 2, 200),
      sample('M0', 10, 1000),
    ])
    expect(report.baseline.commits).toBe(11)
    expect(report.challenger.commits).toBe(3)
    expect(report.baseline.parseWork).toBe(1100)
    expect(report.challenger.parseWork).toBe(300)
    expect(report.baseline.longTasksSupported).toBe(true)
    expect(report.challenger.longTasksSupported).toBe(true)
  })

  it('does not report zero long tasks when the browser cannot observe them', () => {
    const report = aggregateReport([sample('M0', 1, 100, false), sample('M1', 1, 100, false)])

    expect(report.baseline.longTasksSupported).toBe(false)
    expect(report.challenger.longTasksSupported).toBe(false)
  })
})

function sample(
  profile: ProfileRunSample['profile'],
  commits: number,
  parseWork: number,
  longTasksSupported = true,
): ProfileRunSample {
  return {
    profile,
    index: 1,
    elapsedMs: 10,
    longTasks: 0,
    longTasksSupported,
    reactCommits: commits,
    reactDurationMs: commits,
    timeline: [],
    snapshot: {
      runId: `${profile}-run`,
      revision: 1,
      phase: 'settled',
      throughInternalSeq: 0,
      parts: [],
      diagnostics: [],
      heavyArtifacts: [],
      heavyMetrics: {
        attempts: 0,
        completed: 0,
        failed: 0,
        pending: 0,
        shikiEnqueuedCodeUnits: 0,
        durationMs: 0,
      },
      metrics: {
        internalEvents: 1,
        commits,
        previewParsePasses: 1,
        previewParsedCodeUnits: parseWork,
        canonicalParsePasses: 1,
        previewParseDurationMs: 1,
        canonicalParseDurationMs: 1,
        fullFallbacks: 0,
        backlogCodeUnits: 0,
        rawToVisibleSamples: 1,
        rawToVisibleP50Ms: 1,
        rawToVisibleP95Ms: 2,
      },
    },
  }
}
