import { BookOpenCheck } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'

import { JournalActions } from './journal-actions'
import {
  journalStorageKey,
  legacyStorageKey,
  exportJournal,
  parseJournal,
} from './lib/journal-storage'
import {
  filterRunsByStatus,
  summarizeRun,
  type RunRecord,
  type RunStatusFilter,
} from './lib/run-journal'
import { RunCard } from './run-card'
import { RunComposer } from './run-composer'
import { filters, initialRuns } from './run-data'
import { RunDetail } from './run-detail'

type Notice = { kind: 'success' | 'error'; text: string }
type JournalState = { runs: RunRecord[]; notice?: Notice }

export function App() {
  const [journal, setJournal] = useState<JournalState>(readInitialJournal)
  const [filter, setFilter] = useState<RunStatusFilter>('all')
  const [selectedId, setSelectedId] = useState(journal.runs[0]?.id ?? '')
  const visibleRuns = useMemo(
    () => filterRunsByStatus(sortRuns(journal.runs), filter),
    [filter, journal.runs],
  )
  const selectedRun = visibleRuns.find((run) => run.id === selectedId) ?? visibleRuns[0]
  const verified = journal.runs.filter((run) => summarizeRun(run).status === 'verified').length

  useEffect(() => {
    try {
      window.localStorage.setItem(journalStorageKey, exportJournal(journal.runs))
      window.localStorage.removeItem(legacyStorageKey)
    } catch {
      setJournal((current) => ({
        ...current,
        notice: { kind: 'error', text: 'Runs are in memory, but browser storage is unavailable.' },
      }))
    }
  }, [journal.runs])

  function addRun(run: RunRecord) {
    setJournal((current) => ({
      runs: [run, ...current.runs],
      notice: { kind: 'success', text: 'Run recorded.' },
    }))
    setSelectedId(run.id)
    setFilter('all')
  }

  function deleteRun(id: string) {
    setJournal((current) => ({
      runs: current.runs.filter((run) => run.id !== id),
      notice: { kind: 'success', text: 'Run deleted.' },
    }))
  }

  function importRuns(runs: RunRecord[]) {
    setJournal({ runs: sortRuns(runs) })
    setSelectedId(runs[0]?.id ?? '')
    setFilter('all')
  }

  return (
    <>
      <a className="skip-link" href="#journal-workspace">
        Skip to journal
      </a>
      <main className="page">
        <section className="journal" aria-label="Run Journal">
          <header className="masthead">
            <div className="brand">
              <span className="brand-mark">
                <BookOpenCheck size={19} aria-hidden="true" />
              </span>
              <div>
                <h1>Run Journal</h1>
                <p>Evidence before confidence.</p>
              </div>
            </div>
            <div className="masthead-actions">
              <span className="score">
                <strong>{verified}</strong> / {journal.runs.length} passed
              </span>
              <JournalActions
                runs={journal.runs}
                onImport={importRuns}
                onNotice={(notice) => setJournal((current) => ({ ...current, notice }))}
              />
            </div>
          </header>

          {journal.notice ? (
            <p className={`notice ${journal.notice.kind}`} role="status">
              {journal.notice.text}
            </p>
          ) : null}

          <div className="workspace" id="journal-workspace">
            <aside className="sidebar" aria-label="Run timeline">
              <div className="list-controls">
                <label>
                  <span>Status</span>
                  <select
                    value={filter}
                    onChange={(event) => setFilter(parseFilter(event.target.value))}
                  >
                    {filters.map((item) => (
                      <option key={item.value} value={item.value}>
                        {item.label}
                      </option>
                    ))}
                  </select>
                </label>
                <RunComposer onCreate={addRun} />
              </div>

              <section className="run-list" aria-label="Runs">
                {visibleRuns.map((run) => (
                  <RunCard
                    key={run.id}
                    run={run}
                    selected={run.id === selectedRun?.id}
                    onSelect={() => setSelectedId(run.id)}
                  />
                ))}
                {!visibleRuns.length ? (
                  <p className="empty-list">No runs match this status.</p>
                ) : null}
              </section>
            </aside>

            <RunDetail key={selectedRun?.id ?? 'empty'} run={selectedRun} onDelete={deleteRun} />
          </div>
        </section>
      </main>
    </>
  )
}

function readInitialJournal(): JournalState {
  if (typeof window === 'undefined') return { runs: initialRuns }
  try {
    const current = window.localStorage.getItem(journalStorageKey)
    const legacy = window.localStorage.getItem(legacyStorageKey)
    const stored = current ?? legacy
    if (!stored) return { runs: initialRuns }
    const runs = parseJournal(stored)
    if (runs)
      return {
        runs: sortRuns(runs),
        notice: legacy
          ? { kind: 'success', text: 'Journal upgraded to the evidence-safe schema.' }
          : undefined,
      }
    window.localStorage.setItem(`${journalStorageKey}-invalid-backup`, stored)
    return {
      runs: initialRuns,
      notice: {
        kind: 'error',
        text: 'Stored data was invalid. A backup was kept before loading samples.',
      },
    }
  } catch {
    return {
      runs: initialRuns,
      notice: {
        kind: 'error',
        text: 'Browser storage could not be read; using in-memory samples.',
      },
    }
  }
}

function sortRuns(runs: RunRecord[]) {
  return runs.toSorted((left, right) => Date.parse(right.updatedAt) - Date.parse(left.updatedAt))
}

function parseFilter(value: string): RunStatusFilter {
  return filters.find((filter) => filter.value === value)?.value ?? 'all'
}
