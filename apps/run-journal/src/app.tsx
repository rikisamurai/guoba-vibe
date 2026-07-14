import { BookOpenCheck } from 'lucide-react'
import { useMemo, useState } from 'react'

import { JournalActions } from './journal-actions'
import {
  filterRunsByStatus,
  summarizeRun,
  type RunRecord,
  type RunStatusFilter,
} from './lib/run-journal'
import { RunCard } from './run-card'
import { RunComposer } from './run-composer'
import { filters } from './run-data'
import { RunDetail } from './run-detail'
import { useJournalStore } from './use-journal-store'

export function App() {
  const journal = useJournalStore()
  const [filter, setFilter] = useState<RunStatusFilter>('all')
  const [selectedId, setSelectedId] = useState(journal.runs[0]?.id ?? '')
  const visibleRuns = useMemo(
    () => filterRunsByStatus(journal.runs, filter),
    [filter, journal.runs],
  )
  const selectedRun = visibleRuns.find((run) => run.id === selectedId) ?? visibleRuns[0]
  const verified = journal.runs.filter((run) => summarizeRun(run).status === 'verified').length

  function addRun(run: RunRecord) {
    if (!journal.addRun(run)) return false
    setSelectedId(run.id)
    setFilter('all')
    return true
  }

  function deleteRun(id: string) {
    journal.deleteRun(id)
  }

  function importRuns(runs: RunRecord[]) {
    if (!journal.importRuns(runs)) return
    setSelectedId(runs[0]?.id ?? '')
    setFilter('all')
  }

  function restoreBackup() {
    const restored = journal.restoreBackup()
    if (!restored) return
    setSelectedId(restored[0]?.id ?? '')
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
                hasBackup={journal.hasBackup}
                onImport={importRuns}
                onRestore={restoreBackup}
                onNotice={journal.setNotice}
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

function parseFilter(value: string): RunStatusFilter {
  return filters.find((filter) => filter.value === value)?.value ?? 'all'
}
