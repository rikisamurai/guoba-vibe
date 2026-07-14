import { exportJournal, parseJournal, type ParseOptions } from './journal-storage'
import type { RunRecord } from './run-types'

export const journalStorageKey = 'run-journal-records-v2'
export const legacyStorageKey = 'run-journal-records-v1'
export const journalRecoveryKey = `${journalStorageKey}-invalid-backup`
export const journalImportBackupKey = `${journalStorageKey}-import-backup`

type StorageAdapter = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>
type Notice = { kind: 'success' | 'error'; text: string }

export type LoadJournalResult = {
  runs: RunRecord[] | null
  notice?: Notice
  protectedPayload?: string
  persistenceBlocked: boolean
  hasBackup: boolean
}

export type SaveJournalResult = { ok: true } | { ok: false; error: string }
export type RestoreJournalResult = { ok: true; runs: RunRecord[] } | { ok: false; error: string }

export function loadJournal(
  storage: StorageAdapter,
  options: ParseOptions = {},
): LoadJournalResult {
  let current: string | null
  let legacy: string | null
  let hasBackup: boolean

  try {
    current = storage.getItem(journalStorageKey)
    legacy = storage.getItem(legacyStorageKey)
    hasBackup = storage.getItem(journalImportBackupKey) !== null
  } catch {
    return {
      runs: null,
      notice: {
        kind: 'error',
        text: 'Browser storage could not be read; changes are blocked to protect existing data.',
      },
      persistenceBlocked: true,
      hasBackup: false,
    }
  }

  if (current !== null) {
    const currentRuns = parseJournal(current, options)
    if (currentRuns) {
      if (isLegacyPayload(current)) {
        const saved = saveJournal(storage, currentRuns)
        return {
          runs: currentRuns,
          notice: saved.ok
            ? { kind: 'success', text: 'Journal upgraded to the evidence-safe schema.' }
            : { kind: 'error', text: 'Legacy runs are in memory; the upgrade was not saved.' },
          persistenceBlocked: false,
          hasBackup,
        }
      }
      removeLegacy(storage)
      return { runs: currentRuns, persistenceBlocked: false, hasBackup }
    }

    return recoverInvalidCurrent(storage, current, legacy, hasBackup, options)
  }

  if (legacy !== null) return loadLegacyJournal(storage, legacy, hasBackup, options)
  return { runs: null, persistenceBlocked: false, hasBackup }
}

export function saveJournal(
  storage: StorageAdapter,
  runs: RunRecord[],
  protectedPayload?: string,
): SaveJournalResult {
  try {
    if (protectedPayload !== undefined) storage.setItem(journalRecoveryKey, protectedPayload)
    storage.setItem(journalStorageKey, exportJournal(runs))
  } catch {
    return {
      ok: false,
      error: 'The journal could not be saved. Storage may be full or unavailable.',
    }
  }
  removeLegacy(storage)
  return { ok: true }
}

export function replaceJournal(
  storage: StorageAdapter,
  currentRuns: RunRecord[],
  nextRuns: RunRecord[],
  protectedPayload?: string,
): SaveJournalResult {
  try {
    storage.setItem(journalImportBackupKey, exportJournal(currentRuns))
  } catch {
    return {
      ok: false,
      error: 'Import stopped because the current journal could not be backed up.',
    }
  }
  return saveJournal(storage, nextRuns, protectedPayload)
}

export function restoreJournalBackup(
  storage: StorageAdapter,
  protectedPayload?: string,
): RestoreJournalResult {
  let payload: string | null
  try {
    payload = storage.getItem(journalImportBackupKey)
  } catch {
    return { ok: false, error: 'The journal backup could not be read.' }
  }
  if (payload === null) return { ok: false, error: 'No import backup is available.' }
  const runs = parseJournal(payload)
  if (!runs) return { ok: false, error: 'The journal backup is invalid.' }
  const saved = saveJournal(storage, runs, protectedPayload)
  return saved.ok ? { ok: true, runs } : saved
}

function recoverInvalidCurrent(
  storage: StorageAdapter,
  current: string,
  legacy: string | null,
  hasBackup: boolean,
  options: ParseOptions,
): LoadJournalResult {
  const legacyRuns = legacy === null ? null : parseJournal(legacy, options)
  const protectedPayload = preserveInvalidPayload(storage, current) ? undefined : current
  if (legacyRuns && protectedPayload === undefined) {
    const saved = saveJournal(storage, legacyRuns)
    if (saved.ok) {
      return {
        runs: legacyRuns,
        notice: {
          kind: 'success',
          text: 'Recovered v1 runs; invalid v2 data remains in a recovery backup.',
        },
        persistenceBlocked: false,
        hasBackup,
      }
    }
  }
  return {
    runs: legacyRuns,
    notice: invalidStorageNotice(Boolean(protectedPayload), Boolean(legacyRuns)),
    protectedPayload,
    persistenceBlocked: false,
    hasBackup,
  }
}

function loadLegacyJournal(
  storage: StorageAdapter,
  payload: string,
  hasBackup: boolean,
  options: ParseOptions,
): LoadJournalResult {
  const runs = parseJournal(payload, options)
  if (!runs) {
    const protectedPayload = preserveInvalidPayload(storage, payload) ? undefined : payload
    return {
      runs: null,
      notice: invalidStorageNotice(Boolean(protectedPayload), false),
      protectedPayload,
      persistenceBlocked: false,
      hasBackup,
    }
  }
  const saved = saveJournal(storage, runs)
  return {
    runs,
    notice: saved.ok
      ? { kind: 'success', text: 'Journal upgraded to the evidence-safe schema.' }
      : { kind: 'error', text: 'Legacy runs are in memory; the v1 journal remains untouched.' },
    persistenceBlocked: false,
    hasBackup,
  }
}

function preserveInvalidPayload(storage: StorageAdapter, payload: string) {
  try {
    storage.setItem(journalRecoveryKey, payload)
    return true
  } catch {
    return false
  }
}

function isLegacyPayload(payload: string) {
  try {
    return Array.isArray(JSON.parse(payload))
  } catch {
    return false
  }
}

function invalidStorageNotice(backupFailed: boolean, recoveredLegacy: boolean): Notice {
  const text = backupFailed
    ? 'Stored data was invalid and remains untouched until a recovery backup can be saved.'
    : recoveredLegacy
      ? 'Invalid v2 data was backed up; v1 runs are loaded in memory.'
      : 'Stored data was invalid. A recovery backup was kept before loading samples.'
  return { kind: 'error', text }
}

function removeLegacy(storage: StorageAdapter) {
  try {
    storage.removeItem(legacyStorageKey)
  } catch {
    // The durable v2 write already succeeded; stale v1 data is harmless.
  }
}
