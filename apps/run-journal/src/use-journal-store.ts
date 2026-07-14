import { useState } from 'react'

import {
  loadJournal,
  replaceJournal,
  restoreJournalBackup,
  saveJournal,
} from './lib/journal-persistence'
import type { RunRecord } from './lib/run-journal'
import { initialRuns } from './run-data'

type Notice = { kind: 'success' | 'error'; text: string }
type JournalState = {
  runs: RunRecord[]
  notice?: Notice
  protectedPayload?: string
  persistenceBlocked: boolean
  hasBackup: boolean
}

export function useJournalStore() {
  const [journal, setJournal] = useState<JournalState>(readInitialJournal)

  function reportError(text: string) {
    setJournal((current) => ({ ...current, notice: { kind: 'error', text } }))
  }

  function canPersist() {
    if (!journal.persistenceBlocked) return true
    reportError('Storage could not be read. Reload after restoring access; nothing was changed.')
    return false
  }

  function commitRuns(nextRuns: RunRecord[], message: string) {
    if (!canPersist()) return false
    const next = sortRuns(nextRuns)
    const result = saveJournal(window.localStorage, next, journal.protectedPayload)
    if (!result.ok) {
      reportError(result.error)
      return false
    }
    setJournal((current) => ({
      ...current,
      runs: next,
      notice: { kind: 'success', text: message },
      protectedPayload: undefined,
      persistenceBlocked: false,
    }))
    return true
  }

  function importRuns(runs: RunRecord[]) {
    if (!canPersist()) return false
    const next = sortRuns(runs)
    const result = replaceJournal(window.localStorage, journal.runs, next, journal.protectedPayload)
    if (!result.ok) {
      reportError(result.error)
      return false
    }
    setJournal({
      runs: next,
      notice: { kind: 'success', text: `${next.length} runs imported.` },
      persistenceBlocked: false,
      hasBackup: true,
    })
    return true
  }

  function restoreBackup() {
    if (!canPersist()) return null
    const result = restoreJournalBackup(window.localStorage, journal.protectedPayload)
    if (!result.ok) {
      reportError(result.error)
      return null
    }
    const runs = sortRuns(result.runs)
    setJournal((current) => ({
      ...current,
      runs,
      notice: { kind: 'success', text: 'Previous journal restored.' },
      protectedPayload: undefined,
      persistenceBlocked: false,
    }))
    return runs
  }

  return {
    ...journal,
    addRun: (run: RunRecord) => commitRuns([run, ...journal.runs], 'Run recorded.'),
    deleteRun: (id: string) =>
      commitRuns(
        journal.runs.filter((run) => run.id !== id),
        'Run deleted.',
      ),
    importRuns,
    restoreBackup,
    setNotice: (notice: Notice) => setJournal((current) => ({ ...current, notice })),
  }
}

function readInitialJournal(): JournalState {
  if (typeof window === 'undefined') {
    return { runs: initialRuns, persistenceBlocked: false, hasBackup: false }
  }
  const loaded = loadJournal(window.localStorage)
  return { ...loaded, runs: sortRuns(loaded.runs ?? initialRuns) }
}

function sortRuns(runs: RunRecord[]) {
  return runs.toSorted((left, right) => Date.parse(right.updatedAt) - Date.parse(left.updatedAt))
}
