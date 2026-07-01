import type { RunRecord, RunStatusFilter } from './lib/run-journal'

export const initialRuns: RunRecord[] = [
  {
    id: 'deep-link-lab',
    title: 'Deep Link Lab PR',
    events: [
      { kind: 'command', label: 'pnpm --filter deep-link-lab test', exitCode: 0 },
      { kind: 'check', label: 'pnpm --filter deep-link-lab build', exitCode: 0 },
      { kind: 'artifact', label: 'browser screenshot', href: '#deep-link-lab' },
    ],
  },
  {
    id: 'qa-board',
    title: 'Screenshot QA Board PR',
    events: [
      { kind: 'command', label: 'pnpm --filter screenshot-qa-board test', exitCode: 0 },
      { kind: 'check', label: 'agent-browser smoke', exitCode: 0 },
      { kind: 'artifact', label: 'before/after capture', href: '#qa-board' },
    ],
  },
  {
    id: 'api-diff',
    title: 'API Diff Lab PR',
    events: [
      { kind: 'command', label: 'pnpm --filter api-diff-lab test', exitCode: 1 },
      { kind: 'artifact', label: 'failure log', href: '#api-diff' },
    ],
  },
]

export const filters: RunStatusFilter[] = ['all', 'verified', 'needs-attention', 'draft']
