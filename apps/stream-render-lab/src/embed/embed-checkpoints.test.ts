import { describe, expect, it } from 'vitest'

import { EMPTY_HEAVY_METRICS, EMPTY_RUN_METRICS } from '../engine/metrics'
import type { RenderSnapshot } from '../engine/types'
import type { LabSettledReport } from '../lab/types'
import { parseCanonical } from '../markdown'
import { labCheckpoints } from './embed-checkpoints'

describe('Quick Start checkpoints', () => {
  it('states the observable result without exposing internal implementation vocabulary', () => {
    const checkpoints = labCheckpoints('quick-start', makeReport())
    const labels = checkpoints.map(({ label }) => label)

    expect(labels).toEqual([
      '两种策略都处理到完整回复',
      '最终接收文本完全相同',
      '最终显示文本追平接收文本且彼此相同',
      'M4 产生更少的显示文本状态更新',
    ])
    expect(labels.join(' ')).not.toMatch(/pipeline|Render IR|commit|Engine publish/i)
    expect(checkpoints.every(({ passed }) => passed)).toBe(true)
  })

  it('rejects two equally truncated displayed texts', () => {
    const report = makeReport()
    report.snapshots.M0 = makeSnapshot('M0', 4, '# 完整')
    report.snapshots.M4 = makeSnapshot('M4', 2, '# 完整')

    const checkpoint = labCheckpoints('quick-start', report).find(
      ({ id }) => id === 'visible-text-equivalent',
    )

    expect(checkpoint?.passed).toBe(false)
  })

  it('does not call a settled truncated response complete', () => {
    const report = makeReport()
    report.snapshots.M0 = {
      ...makeSnapshot('M0', 4),
      outcome: { kind: 'truncated', cause: 'eof', retryable: true },
    }
    report.snapshots.M4 = {
      ...makeSnapshot('M4', 2),
      outcome: { kind: 'truncated', cause: 'eof', retryable: true },
    }

    const checkpoint = labCheckpoints('quick-start', report).find(
      ({ id }) => id === 'complete-response',
    )

    expect(checkpoint?.passed).toBe(false)
  })
})

function makeReport(): LabSettledReport {
  return {
    runId: 'run-m4',
    outcome: 'completed',
    snapshots: {
      M0: makeSnapshot('M0', 4),
      M4: makeSnapshot('M4', 2),
    },
    trace: { wire: [], decoded: [], lines: [], sse: [], events: [] },
    visibleTextUpdates: { M0: 3, M4: 2 },
  }
}

function makeSnapshot(
  profile: 'M0' | 'M4',
  commits: number,
  visible = '# 完整回复',
): RenderSnapshot {
  const text = '# 完整回复'
  return {
    runId: `run-${profile.toLowerCase()}`,
    revision: commits,
    phase: 'settled',
    outcome: { kind: 'completed', reason: 'fixture-complete' },
    throughInternalSeq: 3,
    parts: [
      {
        id: 'answer',
        kind: 'answer',
        raw: text,
        visible,
        ended: true,
        document: parseCanonical(text),
      },
    ],
    metrics: { ...EMPTY_RUN_METRICS, commits },
    diagnostics: [],
    heavyArtifacts: [],
    heavyMetrics: EMPTY_HEAVY_METRICS,
  }
}
