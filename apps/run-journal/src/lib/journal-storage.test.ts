import { describe, expect, it } from 'vitest'

import {
  journalImportBackupKey,
  journalRecoveryKey,
  journalStorageKey,
  legacyStorageKey,
  loadJournal,
  replaceJournal,
  restoreJournalBackup,
  saveJournal,
} from './journal-persistence'
import { exportJournal, parseJournal } from './journal-storage'
import type { RunRecord } from './run-types'

const timestamp = '2026-07-14T03:00:00.000Z'

const storedRun: RunRecord = {
  id: 'run-1',
  title: 'Build',
  createdAt: timestamp,
  updatedAt: timestamp,
  events: [{ id: 'step-1', kind: 'command', label: 'pnpm build', exitCode: 0 }],
}

function createStorage(initial: Record<string, string> = {}, failSetKey?: string) {
  const values = new Map(Object.entries(initial))
  return {
    values,
    storage: {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => {
        if (key === failSetKey) throw new Error('quota')
        values.set(key, value)
      },
      removeItem: (key: string) => {
        values.delete(key)
      },
    },
  }
}

describe('journal import and export', () => {
  it('round trips the versioned journal envelope', () => {
    const runs = [storedRun]

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

  it('rewrites a legacy array found under the current storage key', () => {
    const legacy = JSON.stringify([
      {
        id: 'legacy-current',
        title: 'Old current run',
        events: [{ kind: 'command', label: 'pnpm test', exitCode: 0 }],
      },
    ])
    const { storage, values } = createStorage({ [journalStorageKey]: legacy })

    const loaded = loadJournal(storage, { now: timestamp })

    expect(loaded.runs?.[0].events[0]).toMatchObject({ exitCode: null })
    expect(JSON.parse(values.get(journalStorageKey) ?? '{}')).toMatchObject({ version: 2 })
  })

  it('rejects unsupported versions and partial records', () => {
    expect(parseJournal('{"version":99,"runs":[]}')).toBeNull()
    expect(parseJournal('{"version":2,"runs":[{"id":"broken"}]}')).toBeNull()
  })

  it.each(['{bad', ''])('falls back to v1 while preserving invalid v2 data (%j)', (current) => {
    const legacy = JSON.stringify([
      {
        id: 'legacy',
        title: 'Old run',
        events: [{ kind: 'command', label: 'pnpm test', exitCode: 0 }],
      },
    ])
    const { storage, values } = createStorage({
      [journalStorageKey]: current,
      [legacyStorageKey]: legacy,
    })

    const loaded = loadJournal(storage, { now: timestamp })

    expect(loaded.runs?.[0]).toMatchObject({ id: 'legacy', title: 'Old run' })
    expect(loaded.runs?.[0].events[0]).toMatchObject({ exitCode: null })
    expect(values.get(journalRecoveryKey)).toBe(current)
    expect(parseJournal(values.get(journalStorageKey) ?? '')).toEqual(loaded.runs)
    expect(values.has(legacyStorageKey)).toBe(false)
  })

  it('leaves corrupt storage untouched when its recovery backup cannot be written', () => {
    const current = '{bad'
    const legacy = JSON.stringify([{ id: 'old', title: 'Old', events: [] }])
    const { storage, values } = createStorage(
      { [journalStorageKey]: current, [legacyStorageKey]: legacy },
      journalRecoveryKey,
    )

    const loaded = loadJournal(storage, { now: timestamp })
    const save = saveJournal(storage, [storedRun], loaded.protectedPayload)

    expect(loaded.runs?.[0].id).toBe('old')
    expect(loaded.protectedPayload).toBe(current)
    expect(save.ok).toBe(false)
    expect(values.get(journalStorageKey)).toBe(current)
    expect(values.get(legacyStorageKey)).toBe(legacy)
  })

  it('backs up the current journal before import and can restore it', () => {
    const imported = [{ ...storedRun, id: 'imported', title: 'Imported' }]
    const { storage, values } = createStorage({
      [journalStorageKey]: exportJournal([storedRun], timestamp),
    })

    expect(replaceJournal(storage, [storedRun], imported).ok).toBe(true)
    expect(parseJournal(values.get(journalImportBackupKey) ?? '')).toEqual([storedRun])
    expect(parseJournal(values.get(journalStorageKey) ?? '')).toEqual(imported)

    const restored = restoreJournalBackup(storage)
    expect(restored).toEqual({ ok: true, runs: [storedRun] })
    expect(parseJournal(values.get(journalStorageKey) ?? '')).toEqual([storedRun])
  })

  it('does not replace a journal when its import backup cannot be written', () => {
    const original = exportJournal([storedRun], timestamp)
    const { storage, values } = createStorage(
      { [journalStorageKey]: original },
      journalImportBackupKey,
    )

    const result = replaceJournal(storage, [storedRun], [])

    expect(result.ok).toBe(false)
    expect(values.get(journalStorageKey)).toBe(original)
  })

  it('reports a failed save without replacing the last durable journal', () => {
    const original = exportJournal([storedRun], timestamp)
    const { storage, values } = createStorage({ [journalStorageKey]: original }, journalStorageKey)

    expect(saveJournal(storage, []).ok).toBe(false)
    expect(values.get(journalStorageKey)).toBe(original)
  })
})
