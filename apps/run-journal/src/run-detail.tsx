import { Check, CircleAlert, Copy, ExternalLink, FileText, Trash2 } from 'lucide-react'
import { useState } from 'react'

import { formatDuration, formatRunDate, runStatusLabel } from './lib/format-run'
import { buildRunMarkdown, summarizeRun, type RunRecord } from './lib/run-journal'

export function RunDetail({ run, onDelete }: { run?: RunRecord; onDelete: (id: string) => void }) {
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [copyState, setCopyState] = useState<'idle' | 'copied' | 'error'>('idle')

  if (!run) {
    return (
      <section className="run-detail empty-detail" aria-label="Selected run evidence">
        <FileText size={28} aria-hidden="true" />
        <h2>No run in this view</h2>
        <p>Change the status filter or record a new run.</p>
      </section>
    )
  }

  const summary = summarizeRun(run)
  const runId = run.id
  const checks = run.events.filter((event) => event.kind !== 'artifact')
  const artifacts = run.events.filter((event) => event.kind === 'artifact')
  const markdown = buildRunMarkdown(run)

  async function copyMarkdown() {
    try {
      await navigator.clipboard.writeText(markdown)
      setCopyState('copied')
    } catch {
      setCopyState('error')
    }
  }

  function deleteRun() {
    if (!confirmDelete) {
      setConfirmDelete(true)
      return
    }
    onDelete(runId)
  }

  return (
    <section className="run-detail" aria-label="Selected run evidence">
      <header className="detail-head">
        <div>
          <span className={`status-label ${summary.status}`}>{runStatusLabel(summary.status)}</span>
          <h2>{run.title}</h2>
          <time dateTime={run.updatedAt}>Recorded {formatRunDate(run.updatedAt)}</time>
        </div>
        <button
          className={`delete-button ${confirmDelete ? 'confirming' : ''}`}
          type="button"
          onClick={deleteRun}
        >
          <Trash2 size={15} aria-hidden="true" />
          {confirmDelete ? 'Confirm delete' : 'Delete'}
        </button>
      </header>

      <div className="evidence-grid" aria-label="Run summary">
        <Metric label="Checks" value={`${summary.checkCount}`} />
        <Metric label="Artifacts" value={`${summary.artifactCount}`} />
        <Metric label="Failures" value={`${summary.failedLabels.length}`} />
        <Metric label="Duration" value={formatDuration(run.durationMs)} />
      </div>

      {run.cwd || run.commit ? (
        <dl className="metadata-strip">
          {run.cwd ? <Metadata label="Working directory" value={run.cwd} /> : null}
          {run.commit ? <Metadata label="Commit" value={run.commit} mono /> : null}
        </dl>
      ) : null}

      <section className="detail-section">
        <div className="section-heading">
          <h3>Commands</h3>
          <span>{checks.length} recorded</span>
        </div>
        <div className="command-list">
          {checks.map((event, index) => {
            const state =
              event.exitCode === null ? 'draft' : event.exitCode === 0 ? 'passed' : 'failed'
            return (
              <article className={`command-row ${state}`} key={event.id}>
                {state === 'passed' ? (
                  <Check size={16} aria-hidden="true" />
                ) : (
                  <CircleAlert size={16} aria-hidden="true" />
                )}
                <div>
                  <small>Step {index + 1}</small>
                  <code>{event.label}</code>
                </div>
                <strong>{event.exitCode === null ? 'Unknown' : `Exit ${event.exitCode}`}</strong>
              </article>
            )
          })}
        </div>
      </section>

      <section className="detail-section">
        <div className="section-heading">
          <h3>Command evidence</h3>
        </div>
        {run.evidence ? (
          <pre className="command-evidence">{run.evidence}</pre>
        ) : (
          <p className="missing-evidence">No output was attached.</p>
        )}
      </section>

      <section className="detail-section">
        <div className="section-heading">
          <h3>Artifacts</h3>
          <span>{artifacts.length}</span>
        </div>
        {artifacts.length ? (
          <div className="artifact-list">
            {artifacts.map((artifact) => (
              <a key={artifact.id} href={artifact.href} target="_blank" rel="noreferrer">
                <FileText size={16} aria-hidden="true" />
                <span>{artifact.label}</span>
                <ExternalLink size={14} aria-hidden="true" />
              </a>
            ))}
          </div>
        ) : (
          <p className="missing-evidence">No artifacts attached.</p>
        )}
      </section>

      <details className="markdown-export">
        <summary>PR-ready Markdown</summary>
        <button type="button" onClick={() => void copyMarkdown()}>
          <Copy size={15} aria-hidden="true" />
          {copyState === 'copied'
            ? 'Copied'
            : copyState === 'error'
              ? 'Copy unavailable'
              : 'Copy Markdown'}
        </button>
        <textarea value={markdown} readOnly aria-label="Markdown evidence export" />
      </details>
    </section>
  )
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="metric">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  )
}

function Metadata({
  label,
  value,
  mono = false,
}: {
  label: string
  value: string
  mono?: boolean
}) {
  return (
    <div>
      <dt>{label}</dt>
      <dd className={mono ? 'mono' : ''}>{value}</dd>
    </div>
  )
}
