import {
  Camera,
  CheckCircle2,
  CircleAlert,
  ClipboardCheck,
  GitPullRequest,
  TerminalSquare,
} from 'lucide-react'
import { useMemo, useState } from 'react'

import {
  filterRunsByStatus,
  summarizeRun,
  type RunRecord,
  type RunStatusFilter,
} from './lib/run-journal'

const runs: RunRecord[] = [
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

const filters: RunStatusFilter[] = ['all', 'verified', 'needs-attention', 'draft']

export function App() {
  const [filter, setFilter] = useState<RunStatusFilter>('all')
  const [selectedId, setSelectedId] = useState(runs[0].id)
  const visibleRuns = useMemo(() => filterRunsByStatus(runs, filter), [filter])
  const selectedRun = runs.find((run) => run.id === selectedId) ?? visibleRuns[0] ?? runs[0]
  const selectedSummary = summarizeRun(selectedRun)
  const verified = runs.filter((run) => summarizeRun(run).status === 'verified').length

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
          <section className="run-list">
            {visibleRuns.map((run) => {
              const summary = summarizeRun(run)
              return (
                <button
                  key={run.id}
                  type="button"
                  className={`run-card ${summary.status} ${run.id === selectedRun.id ? 'selected' : ''}`}
                  onClick={() => setSelectedId(run.id)}
                >
                  <GitPullRequest size={18} aria-hidden="true" />
                  <span>
                    <strong>{run.title}</strong>
                    <small>{summary.status}</small>
                  </span>
                  <em>{summary.checkCount} checks</em>
                </button>
              )
            })}
          </section>

          <section className="run-detail" aria-label="Selected run evidence">
            <div className="detail-head">
              <div>
                <p className="eyebrow">selected run</p>
                <h2>{selectedRun.title}</h2>
              </div>
              <span className={`status-chip ${selectedSummary.status}`}>
                {selectedSummary.status}
              </span>
            </div>

            <div className="evidence-grid">
              <Metric label="Checks" value={selectedSummary.checkCount} />
              <Metric label="Artifacts" value={selectedSummary.artifactCount} />
              <Metric label="Failures" value={selectedSummary.failedLabels.length} />
            </div>

            <div className="timeline">
              {selectedRun.events.map((event, index) => (
                <article key={`${event.kind}-${event.label}`} className={`event-row ${event.kind}`}>
                  {event.kind === 'artifact' ? (
                    <Camera size={17} aria-hidden="true" />
                  ) : event.exitCode === 0 ? (
                    <TerminalSquare size={17} aria-hidden="true" />
                  ) : (
                    <CircleAlert size={17} aria-hidden="true" />
                  )}
                  <div>
                    <span>{event.label}</span>
                    <small>step {index + 1}</small>
                  </div>
                  <strong>{event.kind === 'artifact' ? 'file' : event.exitCode}</strong>
                </article>
              ))}
            </div>

            <aside className="checklist">
              <ClipboardCheck size={18} aria-hidden="true" />
              <div>
                <strong>PR note readiness</strong>
                <p>
                  {selectedSummary.failedLabels.length
                    ? selectedSummary.failedLabels.join(', ')
                    : 'Verification evidence is ready to cite.'}
                </p>
              </div>
            </aside>
          </section>
        </div>
      </section>
    </main>
  )
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="metric">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  )
}
