import { Camera, CheckCircle2, GitPullRequest, TerminalSquare } from 'lucide-react'

import { summarizeRun, type RunRecord } from './lib/run-journal'

const runs: RunRecord[] = [
  {
    id: 'deep-link-lab',
    title: 'Deep Link Lab PR',
    events: [
      { kind: 'command', label: 'pnpm --filter deep-link-lab test', exitCode: 0 },
      { kind: 'check', label: 'pnpm --filter deep-link-lab build', exitCode: 0 },
      { kind: 'artifact', label: 'workspace screenshot', href: '#deep-link-lab' },
    ],
  },
  {
    id: 'qa-board',
    title: 'Screenshot QA Board PR',
    events: [
      { kind: 'command', label: 'pnpm --filter screenshot-qa-board test', exitCode: 0 },
      { kind: 'check', label: 'browser smoke', exitCode: 0 },
      { kind: 'artifact', label: 'before/after frame', href: '#qa-board' },
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

export function App() {
  const summaries = runs.map(summarizeRun)
  const verified = summaries.filter((summary) => summary.status === 'verified').length

  return (
    <main className="page">
      <section className="journal" aria-label="Codex Run Journal">
        <header className="masthead">
          <div>
            <p className="eyebrow">agent evidence</p>
            <h1>Codex Run Journal</h1>
          </div>
          <div className="score">
            <CheckCircle2 size={18} aria-hidden="true" />
            <span>
              {verified}/{summaries.length} verified
            </span>
          </div>
        </header>

        <div className="content">
          <section className="run-list">
            {runs.map((run) => {
              const summary = summarizeRun(run)

              return (
                <article key={run.id} className={`run-card ${summary.status}`}>
                  <div className="run-heading">
                    <GitPullRequest size={18} aria-hidden="true" />
                    <div>
                      <h2>{run.title}</h2>
                      <p>{summary.status}</p>
                    </div>
                  </div>
                  <dl>
                    <div>
                      <dt>Checks</dt>
                      <dd>{summary.checkCount}</dd>
                    </div>
                    <div>
                      <dt>Artifacts</dt>
                      <dd>{summary.artifactCount}</dd>
                    </div>
                  </dl>
                  {summary.failedLabels.length > 0 ? (
                    <code>{summary.failedLabels.join(', ')}</code>
                  ) : (
                    <code>ready for PR notes</code>
                  )}
                </article>
              )
            })}
          </section>

          <section className="timeline" aria-label="Selected run timeline">
            <h2>Latest evidence</h2>
            {runs[0].events.map((event) => (
              <article key={`${event.kind}-${event.label}`} className="event-row">
                {event.kind === 'artifact' ? (
                  <Camera size={17} aria-hidden="true" />
                ) : (
                  <TerminalSquare size={17} aria-hidden="true" />
                )}
                <span>{event.label}</span>
                <strong>{event.kind === 'artifact' ? 'file' : event.exitCode}</strong>
              </article>
            ))}
          </section>
        </div>
      </section>
    </main>
  )
}
