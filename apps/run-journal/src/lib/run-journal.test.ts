import { describe, expect, it } from 'vitest'

import { summarizeRun } from './run-journal'

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
})
