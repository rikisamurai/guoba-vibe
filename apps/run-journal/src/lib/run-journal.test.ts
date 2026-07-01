import { describe, expect, it } from 'vitest'

import {
  buildRunMarkdown,
  createRunFromLog,
  filterRunsByStatus,
  parseRunRecords,
  summarizeRun,
} from './run-journal'

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

  it('creates a run from pasted command evidence', () => {
    expect(
      createRunFromLog(
        'API Diff verification',
        `pnpm --filter api-diff-lab test\npnpm --filter api-diff-lab build`,
      ),
    ).toEqual({
      id: 'api-diff-verification',
      title: 'API Diff verification',
      events: [
        { kind: 'command', label: 'pnpm --filter api-diff-lab test', exitCode: 0 },
        { kind: 'command', label: 'pnpm --filter api-diff-lab build', exitCode: 0 },
      ],
    })
  })

  it('exports PR-ready markdown with failures and artifacts', () => {
    const markdown = buildRunMarkdown({
      id: 'r1',
      title: 'QA Board',
      events: [
        { kind: 'command', label: 'pnpm test', exitCode: 0 },
        { kind: 'check', label: 'pnpm build', exitCode: 1 },
        { kind: 'artifact', label: 'screenshot', href: '/tmp/qa.png' },
      ],
    })

    expect(markdown).toContain('## QA Board')
    expect(markdown).toContain('- [x] `pnpm test`')
    expect(markdown).toContain('- [ ] `pnpm build`')
    expect(markdown).toContain('- screenshot: /tmp/qa.png')
  })

  it('parses persisted run records and rejects malformed payloads', () => {
    const payload = JSON.stringify([
      { id: 'r1', title: 'Verified', events: [{ kind: 'check', label: 'test', exitCode: 0 }] },
    ])

    expect(parseRunRecords(payload)).toEqual([
      { id: 'r1', title: 'Verified', events: [{ kind: 'check', label: 'test', exitCode: 0 }] },
    ])
    expect(parseRunRecords('{"bad":true}')).toBeNull()
  })
})
