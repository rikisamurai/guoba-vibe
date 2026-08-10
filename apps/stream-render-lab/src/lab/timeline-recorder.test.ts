import { describe, expect, it } from 'vitest'

import { VirtualClock } from '../engine/clock'
import { EMPTY_HEAVY_METRICS, EMPTY_RUN_METRICS } from '../engine/metrics'
import type { RenderSnapshot } from '../engine/types'
import { createTimelineRecorder } from './timeline-recorder'

describe('timeline recorder', () => {
  it('records wire arrivals on a clock-relative timeline', () => {
    const clock = new VirtualClock()
    clock.advanceBy(40)
    const recorder = createTimelineRecorder({ clock, plannedDurationMs: 320 })

    clock.advanceBy(25)
    recorder.observeArrival({
      index: 3,
      byteLength: 7,
      delayMs: 25,
      hex: 'e4 b8 ad',
      preview: '中',
    })

    expect(recorder.snapshot()).toEqual({
      elapsedMs: 25,
      plannedDurationMs: 320,
      arrivals: [
        {
          atMs: 25,
          index: 3,
          byteLength: 7,
          delayMs: 25,
          hex: 'e4 b8 ad',
          preview: '中',
        },
      ],
      publishes: {},
    })
  })

  it('records a profile publish only when its engine commit count grows', () => {
    const clock = new VirtualClock()
    const recorder = createTimelineRecorder({ clock, plannedDurationMs: 100 })

    recorder.observePublish('M0', makeSnapshot(1, 2, ['ab', 'c'], ['a', '']))
    clock.advanceBy(5)
    recorder.observePublish('M0', makeSnapshot(1, 3, ['abcd'], ['abc']))
    clock.advanceBy(7)
    recorder.observePublish('M0', makeSnapshot(2, 4, ['abcd'], ['abcd']))
    recorder.observePublish('M4', makeSnapshot(1, 8, ['xy'], ['x']))

    expect(recorder.snapshot().publishes).toEqual({
      M0: [
        { atMs: 0, revision: 2, rawLength: 3, visibleLength: 1, commits: 1 },
        { atMs: 12, revision: 4, rawLength: 4, visibleLength: 4, commits: 2 },
      ],
      M4: [{ atMs: 12, revision: 8, rawLength: 2, visibleLength: 1, commits: 1 }],
    })
  })

  it('does not expose its mutable point arrays through snapshots', () => {
    const clock = new VirtualClock()
    const recorder = createTimelineRecorder({ clock, plannedDurationMs: 100 })
    recorder.observeArrival({ index: 0, byteLength: 1, delayMs: 0, hex: '61', preview: 'a' })
    recorder.observePublish('M0', makeSnapshot(1, 1, ['a'], ['a']))

    const first = recorder.snapshot()
    const second = recorder.snapshot()

    expect(second.arrivals).toHaveLength(1)
    expect(second.publishes.M0).toHaveLength(1)
    expect(second.arrivals).not.toBe(first.arrivals)
    expect(second.publishes.M0).not.toBe(first.publishes.M0)
  })
})

function makeSnapshot(
  commits: number,
  revision: number,
  rawParts: readonly string[],
  visibleParts: readonly string[],
): RenderSnapshot {
  return {
    runId: 'run-timeline',
    revision,
    phase: 'streaming',
    throughInternalSeq: null,
    parts: rawParts.map((raw, index) => {
      const visible = visibleParts[index] ?? ''
      return {
        id: `part-${index}`,
        kind: 'answer',
        raw,
        visible,
        ended: false,
        document: {
          raw,
          visible,
          blocks: [],
          diagnostics: [],
          work: { parsedCodeUnits: raw.length, strategy: 'full' },
        },
      }
    }),
    metrics: { ...EMPTY_RUN_METRICS, commits },
    diagnostics: [],
    heavyArtifacts: [],
    heavyMetrics: EMPTY_HEAVY_METRICS,
  }
}
