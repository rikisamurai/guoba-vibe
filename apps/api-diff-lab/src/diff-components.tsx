import { Braces, SplitSquareHorizontal } from 'lucide-react'

import type { DiffRow } from './lib/api-diff'

export function JsonEditor({
  label,
  value,
  onChange,
}: {
  label: string
  value: string
  onChange: (value: string) => void
}) {
  return (
    <label className="editor">
      <span>
        <Braces size={16} aria-hidden="true" />
        {label}
      </span>
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        spellCheck={false}
      />
    </label>
  )
}

export function DiffGroup({
  kind,
  rows,
  selectedPath,
  onSelect,
}: {
  kind: DiffRow['kind']
  rows: DiffRow[]
  selectedPath: string
  onSelect: (path: string) => void
}) {
  return (
    <article className={`diff-group ${kind}`}>
      <h3>
        {kind} <span>{rows.length}</span>
      </h3>
      {rows.length ? (
        rows.map((row) => (
          <button
            key={`${row.kind}-${row.path}`}
            type="button"
            className={row.path === selectedPath ? 'selected' : ''}
            onClick={() => onSelect(row.path)}
          >
            <code>{row.path}</code>
            <small>{readTypes(row)}</small>
          </button>
        ))
      ) : (
        <p>none</p>
      )}
    </article>
  )
}

export function DiffInspector({ row }: { row?: DiffRow }) {
  if (!row) {
    return (
      <aside className="inspector empty">
        <SplitSquareHorizontal size={20} aria-hidden="true" />
        <p>No structural drift detected.</p>
      </aside>
    )
  }

  return (
    <aside className={`inspector ${row.kind}`}>
      <span className="kind">{row.kind}</span>
      <h3>{row.path}</h3>
      <div className="type-grid">
        <TypeCell label="Before" value={readBefore(row)} />
        <TypeCell label="After" value={readAfter(row)} />
      </div>
      <p>{readImpact(row)}</p>
    </aside>
  )
}

function TypeCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="type-cell">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  )
}

function readTypes(row: DiffRow) {
  return `${readBefore(row)} -> ${readAfter(row)}`
}

function readBefore(row: DiffRow) {
  return row.kind === 'added' ? 'missing' : row.beforeType
}

function readAfter(row: DiffRow) {
  return row.kind === 'removed' ? 'missing' : row.afterType
}

function readImpact(row: DiffRow) {
  if (row.kind === 'added')
    return 'New response field. Check whether clients should render or ignore it.'
  if (row.kind === 'removed')
    return 'Removed response field. Existing consumers may need a migration path.'
  return 'Type drift. Treat this as a contract break until callers confirm parsing behavior.'
}
