import { Camera, CircleAlert, ClipboardCheck, Copy, TerminalSquare } from 'lucide-react'

import { buildRunMarkdown, summarizeRun, type RunRecord } from './lib/run-journal'

export function RunDetail({ run }: { run: RunRecord }) {
  const summary = summarizeRun(run)
  const markdown = buildRunMarkdown(run)

  return (
    <section className="run-detail" aria-label="Selected run evidence">
      <div className="detail-head">
        <div>
          <p className="eyebrow">selected run</p>
          <h2>{run.title}</h2>
        </div>
        <span className={`status-chip ${summary.status}`}>{summary.status}</span>
      </div>

      <div className="evidence-grid">
        <Metric label="Checks" value={summary.checkCount} />
        <Metric label="Artifacts" value={summary.artifactCount} />
        <Metric label="Failures" value={summary.failedLabels.length} />
      </div>

      <div className="timeline">
        {run.events.map((event, index) => (
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
            {summary.failedLabels.length
              ? summary.failedLabels.join(', ')
              : 'Verification evidence is ready to cite.'}
          </p>
        </div>
      </aside>

      <section className="markdown-export" aria-label="Markdown export">
        <button type="button" onClick={() => void navigator.clipboard?.writeText(markdown)}>
          <Copy size={16} aria-hidden="true" />
          Copy Markdown
        </button>
        <textarea value={markdown} readOnly />
      </section>
    </section>
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
