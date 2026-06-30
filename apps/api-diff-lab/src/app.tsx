import { AlertTriangle, GitCompareArrows, ListChecks, RotateCcw } from 'lucide-react'
import { useMemo, useState } from 'react'

import { DiffGroup, DiffInspector, JsonEditor } from './diff-components'
import { samples } from './diff-samples'
import { buildDiffRows, type DiffRow } from './lib/api-diff'

const diffKinds: DiffRow['kind'][] = ['added', 'removed', 'changed']

export function App() {
  const [before, setBefore] = useState(samples[0].before)
  const [after, setAfter] = useState(samples[0].after)
  const [activeSample, setActiveSample] = useState(samples[0].id)
  const [selectedPath, setSelectedPath] = useState('')

  const result = useMemo(() => {
    try {
      const rows = buildDiffRows(JSON.parse(before), JSON.parse(after))
      return { rows, error: '' }
    } catch {
      return {
        rows: [],
        error: 'Invalid JSON. Fix the editor payload before reading the contract delta.',
      }
    }
  }, [before, after])

  const selectedRow = result.rows.find((row) => row.path === selectedPath) ?? result.rows[0]

  function loadSample(sampleId: string) {
    const sample = samples.find((item) => item.id === sampleId) ?? samples[0]
    setBefore(sample.before)
    setAfter(sample.after)
    setActiveSample(sample.id)
    setSelectedPath('')
  }

  return (
    <main className="page">
      <section className="lab" aria-label="API Diff Lab">
        <header className="topbar">
          <div>
            <p className="eyebrow">contract forensics</p>
            <h1>API Diff Lab</h1>
          </div>
          <div className="status">
            <ListChecks size={17} aria-hidden="true" />
            {result.rows.length} changes
          </div>
        </header>

        <nav className="sample-bar" aria-label="Diff samples">
          {samples.map((sample) => (
            <button
              key={sample.id}
              type="button"
              className={activeSample === sample.id ? 'active' : ''}
              onClick={() => loadSample(sample.id)}
            >
              {sample.label}
            </button>
          ))}
          <button type="button" onClick={() => loadSample(activeSample)}>
            <RotateCcw size={15} aria-hidden="true" />
            Reset
          </button>
        </nav>

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
            <p className="error">
              <AlertTriangle size={16} aria-hidden="true" />
              {result.error}
            </p>
          ) : (
            <div className="diff-workspace">
              <div className="row-list">
                {diffKinds.map((kind) => (
                  <DiffGroup
                    key={kind}
                    kind={kind}
                    rows={result.rows.filter((row) => row.kind === kind)}
                    selectedPath={selectedRow?.path ?? ''}
                    onSelect={setSelectedPath}
                  />
                ))}
              </div>
              <DiffInspector row={selectedRow} />
            </div>
          )}
        </section>
      </section>
    </main>
  )
}
