import { Clock3 } from 'lucide-react'

import { formatRunDate, runStatusLabel } from './lib/format-run'
import { summarizeRun, type RunRecord } from './lib/run-journal'

export function RunCard({
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
      aria-pressed={selected}
      onClick={onSelect}
    >
      <span className="timeline-dot" aria-hidden="true" />
      <span className="run-card-copy">
        <span className={`status-label ${summary.status}`}>{runStatusLabel(summary.status)}</span>
        <strong>{run.title}</strong>
        <small>
          {summary.checkCount} {summary.checkCount === 1 ? 'check' : 'checks'}
          {summary.draftCount ? ` · ${summary.draftCount} unknown` : ''}
        </small>
        <time dateTime={run.updatedAt}>
          <Clock3 size={12} aria-hidden="true" />
          {formatRunDate(run.updatedAt)}
        </time>
      </span>
    </button>
  )
}
