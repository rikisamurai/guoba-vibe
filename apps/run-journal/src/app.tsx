import { CheckCircle2, GitPullRequest } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'

import {
  filterRunsByStatus,
  parseRunRecords,
  summarizeRun,
  type RunRecord,
  type RunStatusFilter,
} from './lib/run-journal'
import { RunComposer } from './run-composer'
import { filters, initialRuns } from './run-data'
import { RunDetail } from './run-detail'

const storageKey = 'run-journal-records-v1'

function readInitialRuns() {
  if (typeof window === 'undefined') {
    return initialRuns
  }

  const stored = window.localStorage.getItem(storageKey)
  return stored ? (parseRunRecords(stored) ?? initialRuns) : initialRuns
}

export function App() {
  const [runs, setRuns] = useState(readInitialRuns)
  const [filter, setFilter] = useState<RunStatusFilter>('all')
  const [selectedId, setSelectedId] = useState(runs[0].id)
  const visibleRuns = useMemo(() => filterRunsByStatus(runs, filter), [filter, runs])
  const selectedRun = runs.find((run) => run.id === selectedId) ?? visibleRuns[0] ?? runs[0]
  const verified = runs.filter((run) => summarizeRun(run).status === 'verified').length

  useEffect(() => {
    window.localStorage.setItem(storageKey, JSON.stringify(runs))
  }, [runs])

  function addRun(run: RunRecord) {
    setRuns((current) => [run, ...current.filter((item) => item.id !== run.id)])
    setSelectedId(run.id)
    setFilter('all')
  }

  return (
    <main className="page">
      <section className="journal" aria-label="Codex Run Journal">
        <header className="masthead">
          <div>
            <p className="eyebrow">command flight recorder</p>
            <h1>Codex Run Journal</h1>
          </div>
          <div className="score">
            <CheckCircle2 size={18} aria-hidden="true" />
            <span>
              {verified}/{runs.length} verified
            </span>
          </div>
        </header>

        <nav className="filters" aria-label="Run status filters">
          {filters.map((item) => (
            <button
              key={item}
              type="button"
              className={item === filter ? 'active' : ''}
              onClick={() => setFilter(item)}
            >
              {item}
            </button>
          ))}
        </nav>

        <div className="content">
          <aside className="sidebar">
            <RunComposer onCreate={addRun} />
            <section className="run-list">
              {visibleRuns.map((run) => (
                <RunCard
                  key={run.id}
                  run={run}
                  selected={run.id === selectedRun.id}
                  onSelect={() => setSelectedId(run.id)}
                />
              ))}
            </section>
          </aside>

          <RunDetail run={selectedRun} />
        </div>
      </section>
    </main>
  )
}

function RunCard({
  run,
  selected,
  onSelect,
}: {
  run: RunRecord
  selected: boolean
  onSelect: () => void
}) {
  const summary = summarizeRun(run)

  return (
    <button
      type="button"
      className={`run-card ${summary.status} ${selected ? 'selected' : ''}`}
      onClick={onSelect}
    >
      <GitPullRequest size={18} aria-hidden="true" />
      <span>
        <strong>{run.title}</strong>
        <small>{summary.status}</small>
      </span>
      <em>{summary.checkCount} checks</em>
    </button>
  )
}
