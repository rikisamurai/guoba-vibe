import { AlertTriangle, GitCompareArrows } from 'lucide-react'
import { useMemo, useState } from 'react'

import { CaseLibrary } from './case-library'
import { DiffGroup, DiffInspector, JsonEditor } from './diff-components'
import { buildDiffReport, buildDiffRows, classifyDiffRows, type DiffRow } from './lib/api-diff'
import { useCaseLibrary } from './use-case-library'

const diffKinds: DiffRow['kind'][] = ['changed', 'removed', 'added', 'unobserved']

export function App() {
  const library = useCaseLibrary()
  const [selectedPath, setSelectedPath] = useState('')
  const result = useMemo(
    () => readDiff(library.before, library.after),
    [library.after, library.before],
  )
  const selectedRow = result.rows.find((row) => row.path === selectedPath) ?? result.rows[0]
  const groups = classifyDiffRows(result.rows)
  const report = result.error ? '' : buildDiffReport(library.label, result.rows)

  async function copyReport() {
    try {
      if (!navigator.clipboard) throw new Error('Clipboard unavailable')
      await navigator.clipboard.writeText(report)
      library.setMessage('Contract report copied.')
    } catch {
      library.setMessage('Copy failed. Select the report text and copy it manually.')
    }
  }

  return (
    <main className="page">
      <section className="lab" aria-label="API Diff Lab">
        <header className="topbar">
          <div className="brand">
            <GitCompareArrows size={19} aria-hidden="true" />
            <div>
              <h1>API DIFF LAB</h1>
              <span>JSON contract forensics</span>
            </div>
          </div>
          <div className="summary" aria-label="Diff summary">
            {result.error ? (
              <span className="invalid">INVALID JSON · CHANGES WITHHELD</span>
            ) : (
              <>
                <strong>{result.rows.length}</strong> changes
                <span className={groups.breaking.length ? 'breaking' : 'clear'}>
                  {groups.breaking.length} breaking
                </span>
                <span className="review">{groups.review.length} review</span>
              </>
            )}
          </div>
        </header>

        <CaseLibrary
          cases={library.cases}
          activeId={library.activeId}
          label={library.label}
          payload={library.payload}
          message={library.message}
          dirty={library.dirty}
          storageError={library.storageError}
          storageBlocked={library.storageBlocked}
          onSelect={library.selectCase}
          onLabelChange={library.setLabel}
          onPayloadChange={library.setPayload}
          onSave={library.saveCase}
          onReset={library.resetCase}
          onDelete={library.deleteCase}
          onExport={library.exportCases}
          onImport={library.importCases}
          onResetLibrary={library.resetLibrary}
        />

        <section className="editors" aria-label="JSON editors">
          <JsonEditor label="Before" value={library.before} onChange={library.setBefore} />
          <JsonEditor label="After" value={library.after} onChange={library.setAfter} />
        </section>

        <section className="diff-panel">
          <div className="panel-title">
            <div>
              <p>INFERRED SHAPE</p>
              <h2>Contract changes</h2>
            </div>
            <span>Arrays use paths such as items[].id</span>
          </div>
          {result.error ? (
            <p className="error" role="alert">
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
          {!result.error ? (
            <section className="report-export" aria-label="Contract report export">
              <div>
                <h2>Review report</h2>
                <button type="button" onClick={() => void copyReport()}>
                  Copy report
                </button>
              </div>
              <textarea value={report} readOnly aria-label="Contract review report" />
            </section>
          ) : null}
        </section>
      </section>
    </main>
  )
}

function readDiff(before: string, after: string) {
  try {
    const beforeValue: unknown = JSON.parse(before)
    try {
      const afterValue: unknown = JSON.parse(after)
      return { rows: buildDiffRows(beforeValue, afterValue), error: '' }
    } catch {
      return { rows: [], error: 'After contains invalid JSON.' }
    }
  } catch {
    return { rows: [], error: 'Before contains invalid JSON.' }
  }
}
