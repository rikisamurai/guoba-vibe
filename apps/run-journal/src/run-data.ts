import type { RunRecord, RunStatusFilter } from './lib/run-journal'

export const initialRuns: RunRecord[] = [
  {
    id: 'sample-failed-build',
    title: 'Known failed build',
    createdAt: '2026-07-13T08:15:00.000Z',
    updatedAt: '2026-07-13T08:15:18.000Z',
    cwd: 'apps/run-journal',
    commit: 'b90f7cc',
    durationMs: 18_000,
    evidence: 'src/app.tsx:12:5 - error TS2339: Property `foo` does not exist.',
    events: [
      {
        id: 'failed-build-command',
        kind: 'command',
        label: 'pnpm --filter run-journal build',
        exitCode: 1,
      },
    ],
  },
  {
    id: 'sample-deep-link',
    title: 'Deep Link Lab PR',
    createdAt: '2026-07-13T07:48:00.000Z',
    updatedAt: '2026-07-13T07:48:11.000Z',
    cwd: 'apps/deep-link-lab',
    commit: '2292b34',
    durationMs: 11_400,
    evidence: '2 test files passed. Vite production bundle completed in 612ms.',
    events: [
      {
        id: 'deep-link-test',
        kind: 'command',
        label: 'pnpm --filter deep-link-lab test',
        exitCode: 0,
      },
      {
        id: 'deep-link-build',
        kind: 'check',
        label: 'pnpm --filter deep-link-lab build',
        exitCode: 0,
      },
      {
        id: 'deep-link-pr',
        kind: 'artifact',
        label: 'Deep Link Lab pull request',
        href: 'https://github.com/rikisamurai/guoba-vibe/pull/37',
      },
    ],
  },
  {
    id: 'sample-api-diff',
    title: 'API Diff Lab array contract',
    createdAt: '2026-07-13T07:32:00.000Z',
    updatedAt: '2026-07-13T07:32:00.000Z',
    cwd: 'apps/api-diff-lab',
    evidence: 'Command captured from the review plan; result has not been run yet.',
    events: [
      {
        id: 'api-diff-test',
        kind: 'command',
        label: 'pnpm --filter api-diff-lab test',
        exitCode: null,
      },
    ],
  },
]

export const filters: Array<{ value: RunStatusFilter; label: string }> = [
  { value: 'all', label: 'All runs' },
  { value: 'verified', label: 'Passed' },
  { value: 'needs-attention', label: 'Failed' },
  { value: 'draft', label: 'Draft' },
]
