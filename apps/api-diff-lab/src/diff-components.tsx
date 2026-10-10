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
        aria-label={`${label} JSON`}
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
        {readKindLabel(kind)} <span>{rows.length}</span>
      </h3>
      {rows.length ? (
        rows.map((row) => (
          <button
            key={`${row.kind}-${row.path}`}
            type="button"
            className={row.path === selectedPath ? 'selected' : ''}
            aria-pressed={row.path === selectedPath}
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
      <span
        className={`impact ${row.kind === 'added' || row.kind === 'unobserved' ? 'review' : 'breaking'}`}
      >
        {row.kind === 'added' || row.kind === 'unobserved' ? 'review' : 'breaking'}
      </span>
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
  if (row.kind === 'unobserved')
    return row.missingSide === 'before' ? 'unobserved' : row.observedType
  return row.kind === 'added' ? 'missing' : row.beforeType
}

function readAfter(row: DiffRow) {
  if (row.kind === 'unobserved')
    return row.missingSide === 'after' ? 'unobserved' : row.observedType
  return row.kind === 'removed' ? 'missing' : row.afterType
}

function readImpact(row: DiffRow) {
  if (row.kind === 'added')
    return 'New field. Tolerant decoders usually accept it; strict decoders may reject it.'
  if (row.kind === 'removed')
    return 'Removed response field. Existing consumers may need a migration path.'
  if (row.kind === 'unobserved')
    return `The ${row.missingSide} array is empty, so its item contract cannot be compared from this sample.`
  return 'Type drift. Treat this as a contract break until callers confirm parsing behavior.'
}

function readKindLabel(kind: DiffRow['kind']) {
  if (kind === 'changed') return 'Type changed'
  if (kind === 'removed') return 'Removed'
  if (kind === 'unobserved') return 'Unobserved items'
  return 'Added'
}
