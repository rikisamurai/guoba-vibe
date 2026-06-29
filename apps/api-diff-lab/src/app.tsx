import { Braces, GitCompareArrows, ListChecks } from 'lucide-react'
import { useMemo, useState } from 'react'

import { diffJsonShapes, type ApiShapeDiff } from './lib/api-diff'

const beforeSample = JSON.stringify({ user: { id: 7, name: 'Riki' }, tags: ['qr'] }, null, 2)
const afterSample = JSON.stringify({ user: { id: '7', handle: 'riki' }, tags: ['qr'] }, null, 2)

export function App() {
  const [before, setBefore] = useState(beforeSample)
  const [after, setAfter] = useState(afterSample)

  const result = useMemo(() => {
    try {
      return { diff: diffJsonShapes(JSON.parse(before), JSON.parse(after)), error: '' }
    } catch {
      return { diff: { added: [], removed: [], changed: [] }, error: 'Invalid JSON' }
    }
  }, [before, after])

  return (
    <main className="page">
      <section className="lab" aria-label="API Diff Lab">
        <header className="topbar">
          <div>
            <p className="eyebrow">contract delta</p>
            <h1>API Diff Lab</h1>
          </div>
          <div className="status">
            <ListChecks size={17} aria-hidden="true" />
            {readTotal(result.diff)} changes
          </div>
        </header>

        <section className="editors">
          <JsonEditor label="Before" value={before} onChange={setBefore} />
          <JsonEditor label="After" value={after} onChange={setAfter} />
        </section>

        <section className="diff-panel">
          <div className="panel-title">
            <GitCompareArrows size={18} aria-hidden="true" />
            <h2>Shape diff</h2>
          </div>
          {result.error ? (
            <p className="error">{result.error}</p>
          ) : (
            <div className="diff-grid">
              <DiffList title="Added" items={result.diff.added} tone="added" />
              <DiffList title="Removed" items={result.diff.removed} tone="removed" />
              <DiffList title="Changed" items={result.diff.changed} tone="changed" />
            </div>
          )}
        </section>
      </section>
    </main>
  )
}

function JsonEditor({
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

function DiffList({ title, items, tone }: { title: string; items: string[]; tone: string }) {
  return (
    <article className={`diff-list ${tone}`}>
      <h3>{title}</h3>
      {items.length > 0 ? items.map((item) => <code key={item}>{item}</code>) : <p>none</p>}
    </article>
  )
}

function readTotal(diff: ApiShapeDiff) {
  return diff.added.length + diff.removed.length + diff.changed.length
}
