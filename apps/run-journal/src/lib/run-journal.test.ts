import { describe, expect, it } from 'vitest'

import {
  buildRunMarkdown,
  createRunFromLog,
  filterRunsByStatus,
  isSafeArtifactHref,
  parseRunRecords,
  summarizeRun,
  type RunRecord,
} from './run-journal'

const timestamp = '2026-07-14T03:00:00.000Z'

function runWith(exitCodes: Array<number | null>): RunRecord {
  return {
    id: 'run-1',
    title: 'Verification',
    createdAt: timestamp,
    updatedAt: timestamp,
    events: exitCodes.map((exitCode, index) => ({
      id: `step-${index}`,
      kind: 'command',
      label: `step ${index + 1}`,
      exitCode,
    })),
  }
}

describe('summarizeRun', () => {
  it('requires explicit successful evidence for every executable step', () => {
    expect(summarizeRun(runWith([0, 0])).status).toBe('verified')
    expect(summarizeRun(runWith([0, null])).status).toBe('draft')
    expect(summarizeRun(runWith([])).status).toBe('draft')
  })

  it('surfaces a known failure even when another step is still draft', () => {
    const summary = summarizeRun(runWith([null, 1]))

    expect(summary.status).toBe('needs-attention')
    expect(summary.failedLabels).toEqual(['step 2'])
    expect(summary.draftCount).toBe(1)
  })

  it('filters runs by their evidence-derived status', () => {
    const runs = [runWith([0]), { ...runWith([1]), id: 'failed' }, { ...runWith([]), id: 'draft' }]

    expect(filterRunsByStatus(runs, 'needs-attention').map((run) => run.id)).toEqual(['failed'])
    expect(filterRunsByStatus(runs, 'all')).toHaveLength(3)
  })
})

describe('createRunFromLog', () => {
  it('keeps unstructured pasted commands in draft by default', () => {
    const run = createRunFromLog(
      {
        title: 'API Diff verification',
        commandLog: 'pnpm test\npnpm build',
        outcome: 'draft',
      },
      { createId: () => 'fixed-id', now: () => new Date(timestamp) },
    )

    expect(run).toMatchObject({
      id: 'fixed-id',
      title: 'API Diff verification',
      createdAt: timestamp,
      updatedAt: timestamp,
      events: [
        { kind: 'command', label: 'pnpm test', exitCode: null },
        { kind: 'command', label: 'pnpm build', exitCode: null },
      ],
    })
    expect(summarizeRun(run).status).toBe('draft')
  })

  it('records an outcome only when the author explicitly selects it', () => {
    const passed = createRunFromLog(
      { title: 'Build', commandLog: 'pnpm build', outcome: 'passed', evidence: 'Done in 4.2s' },
      { createId: () => 'passed', now: () => new Date(timestamp) },
    )
    const failed = createRunFromLog(
      { title: 'Build', commandLog: 'pnpm build', outcome: 'failed', exitCode: 2 },
      { createId: () => 'failed', now: () => new Date(timestamp) },
    )

    expect(passed.events[0]).toMatchObject({ exitCode: 0 })
    expect(passed.evidence).toBe('Done in 4.2s')
    expect(failed.events[0]).toMatchObject({ exitCode: 2 })
  })

  it('supports mixed per-command outcomes through explicit line prefixes', () => {
    const run = createRunFromLog(
      {
        title: 'Release gate',
        commandLog:
          '[0] pnpm test\n[2] pnpm build\n[?] agent-browser smoke\n[9007199254740992] unsafe exit',
        outcome: 'draft',
        durationMs: Number.POSITIVE_INFINITY,
      },
      { createId: () => 'mixed', now: () => new Date(timestamp) },
    )

    expect(run.events).toMatchObject([
      { label: 'pnpm test', exitCode: 0 },
      { label: 'pnpm build', exitCode: 2 },
      { label: 'agent-browser smoke', exitCode: null },
      { label: 'unsafe exit', exitCode: null },
    ])
    expect(run.durationMs).toBeUndefined()
    expect(summarizeRun(run).status).toBe('needs-attention')
  })

  it('uses generated IDs instead of title slugs, preserving duplicate and non-ASCII titles', () => {
    let nextId = 0
    const options = { createId: () => `run-${++nextId}`, now: () => new Date(timestamp) }
    const first = createRunFromLog(
      { title: '发布验证', commandLog: 'pnpm test', outcome: 'draft' },
      options,
    )
    const second = createRunFromLog(
      { title: '发布验证', commandLog: 'pnpm test', outcome: 'draft' },
      options,
    )

    expect(first.title).toBe('发布验证')
    expect(first.id).not.toBe(second.id)
  })
})

describe('exports and persistence validation', () => {
  it('exports passed, failed, and unknown evidence without overstating readiness', () => {
    const run = runWith([0, 1, null])
    const markdown = buildRunMarkdown({ ...run, evidence: 'TS2322 at src/app.tsx:12' })

    expect(markdown).toContain('- [x] `step 1` — passed')
    expect(markdown).toContain('- [ ] `step 2` — failed (exit 1)')
    expect(markdown).toContain('- [ ] `step 3` — no result recorded')
    expect(markdown).toContain('TS2322 at src/app.tsx:12')
  })

  it('accepts safe artifact links and rejects executable schemes', () => {
    expect(isSafeArtifactHref('https://github.com/example/run/1')).toBe(true)
    expect(isSafeArtifactHref('./docs/result.png')).toBe(true)
    expect(isSafeArtifactHref('javascript:alert(1)')).toBe(false)
    expect(isSafeArtifactHref('data:text/html,bad')).toBe(false)
  })

  it('parses current records and rejects malformed evidence', () => {
    const valid = JSON.stringify([runWith([0])])
    const unsafeArtifact = JSON.stringify([
      {
        ...runWith([]),
        events: [{ id: 'a1', kind: 'artifact', label: 'bad', href: 'javascript:alert(1)' }],
      },
    ])
    const duplicateEvent = JSON.stringify([
      {
        ...runWith([0, 0]),
        events: [
          { id: 'duplicate', kind: 'command', label: 'first', exitCode: 0 },
          { id: 'duplicate', kind: 'command', label: 'second', exitCode: 0 },
        ],
      },
    ])

    expect(parseRunRecords(valid)).toHaveLength(1)
    expect(parseRunRecords(unsafeArtifact)).toBeNull()
    expect(parseRunRecords(duplicateEvent)).toBeNull()
    expect(parseRunRecords('{"bad":true}')).toBeNull()
  })
})
