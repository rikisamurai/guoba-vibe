import { describe, expect, it } from 'vitest'

import { filterRunsByStatus, summarizeRun } from './run-journal'

describe('summarizeRun', () => {
  it('marks a run verified when checks exist and every command exits cleanly', () => {
    const summary = summarizeRun({
      id: 'r1',
      title: 'Deep Link Lab PR',
      events: [
        { kind: 'command', label: 'pnpm test', exitCode: 0 },
        { kind: 'check', label: 'build', exitCode: 0 },
        { kind: 'artifact', label: 'screenshot', href: 'file:///tmp/app.png' },
      ],
    })

    expect(summary).toEqual({
      id: 'r1',
      title: 'Deep Link Lab PR',
      status: 'verified',
      checkCount: 2,
      artifactCount: 1,
      failedLabels: [],
    })
  })

  it('filters runs by computed status for focused review queues', () => {
    const runs = [
      {
        id: 'verified',
        title: 'Verified',
        events: [{ kind: 'check' as const, label: 'test', exitCode: 0 }],
      },
      {
        id: 'attention',
        title: 'Attention',
        events: [{ kind: 'command' as const, label: 'build', exitCode: 1 }],
      },
      { id: 'draft', title: 'Draft', events: [] },
    ]

    expect(filterRunsByStatus(runs, 'needs-attention').map((run) => run.id)).toEqual(['attention'])
    expect(filterRunsByStatus(runs, 'all').map((run) => run.id)).toEqual([
      'verified',
      'attention',
      'draft',
    ])
  })
})
