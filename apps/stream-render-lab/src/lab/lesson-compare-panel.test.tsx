import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { EMPTY_HEAVY_METRICS, EMPTY_RUN_METRICS } from '../engine/metrics'
import type { RenderSnapshot } from '../engine/types'
import { parseCanonical } from '../markdown'
import { LessonComparePanel } from './lesson-compare-panel'
import type { LabState, LabTimelineSnapshot } from './types'

const actions = {
  onPause() {},
  onReset() {},
  onResume() {},
  onStart() {},
  onStep() {},
}

describe('LessonComparePanel', () => {
  it('keeps the time comparison and both rendered outputs in the lesson surface', () => {
    const html = renderToStaticMarkup(
      <LessonComparePanel
        actions={actions}
        baseline="M0"
        challenger="M4"
        state={makeState()}
        timeline={makeTimeline()}
      />,
    )

    expect(html).toContain('ARRIVAL CLOCK')
    expect(html).toContain('M0 Engine publish')
    expect(html).toContain('M4 Engine publish')
    expect(html.match(/Engine commits/g)).toHaveLength(2)
    expect(html).toContain('M0 visible output')
    expect(html).toContain('M4 visible output')
    expect(html).not.toContain('<textarea')
    expect(html).not.toContain('INPUT · editable Markdown')
  })
})

function makeState(): LabState {
  return {
    status: 'running',
    progress: { current: 1, total: 2 },
    snapshots: {
      M0: makeSnapshot('M0 visible output', 2),
      M4: makeSnapshot('M4 visible output', 1),
    },
    timeline: makeTimeline(),
    trace: { wire: [], decoded: [], lines: [], sse: [], events: [] },
  }
}

function makeTimeline(): LabTimelineSnapshot {
  return {
    elapsedMs: 40,
    plannedDurationMs: 100,
    arrivals: [{ atMs: 10, index: 0, byteLength: 1, delayMs: 10, hex: '61', preview: 'a' }],
    publishes: {
      M0: [{ atMs: 20, revision: 2, rawLength: 17, visibleLength: 17, commits: 2 }],
      M4: [{ atMs: 30, revision: 1, rawLength: 17, visibleLength: 17, commits: 1 }],
    },
  }
}

function makeSnapshot(text: string, commits: number): RenderSnapshot {
  return {
    runId: `run-${commits}`,
    revision: commits,
    phase: 'streaming',
    throughInternalSeq: null,
    parts: [
      {
        id: 'answer',
        kind: 'answer',
        raw: text,
        visible: text,
        ended: false,
        document: parseCanonical(text),
      },
    ],
    metrics: { ...EMPTY_RUN_METRICS, commits },
    diagnostics: [],
    heavyArtifacts: [],
    heavyMetrics: EMPTY_HEAVY_METRICS,
  }
}
