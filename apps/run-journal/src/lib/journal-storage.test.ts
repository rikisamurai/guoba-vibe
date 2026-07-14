import { describe, expect, it } from 'vitest'

import { exportJournal, parseJournal } from './journal-storage'

const timestamp = '2026-07-14T03:00:00.000Z'

describe('journal import and export', () => {
  it('round trips the versioned journal envelope', () => {
    const runs = [
      {
        id: 'run-1',
        title: 'Build',
        createdAt: timestamp,
        updatedAt: timestamp,
        events: [{ id: 'step-1', kind: 'command' as const, label: 'pnpm build', exitCode: 0 }],
      },
    ]

    expect(parseJournal(exportJournal(runs, timestamp))).toEqual(runs)
  })

  it('migrates legacy arrays without preserving unprovable success', () => {
    const legacy = JSON.stringify([
      {
        id: 'legacy',
        title: 'Old run',
        events: [
          { kind: 'command', label: 'pnpm test', exitCode: 0 },
          { kind: 'artifact', label: 'report', href: '#report' },
        ],
      },
    ])
    const parsed = parseJournal(legacy, { now: timestamp })

    expect(parsed?.[0]).toMatchObject({ createdAt: timestamp, updatedAt: timestamp })
    expect(parsed?.[0].events[0]).toMatchObject({ exitCode: null })
    expect(parsed?.[0].events[0].id).toBeTruthy()
    expect(parsed?.[0].evidence).toContain('Reconfirm each command result')
  })

  it('rejects unsupported versions and partial records', () => {
    expect(parseJournal('{"version":99,"runs":[]}')).toBeNull()
    expect(parseJournal('{"version":2,"runs":[{"id":"broken"}]}')).toBeNull()
  })
})
