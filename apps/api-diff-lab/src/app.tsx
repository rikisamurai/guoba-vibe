import { AlertTriangle, GitCompareArrows, ListChecks, RotateCcw } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'

import { DiffGroup, DiffInspector, JsonEditor } from './diff-components'
import { samples } from './diff-samples'
import {
  buildDiffReport,
  buildDiffRows,
  parseDiffCases,
  type DiffCase,
  type DiffRow,
} from './lib/api-diff'

const diffKinds: DiffRow['kind'][] = ['added', 'removed', 'changed']
const storageKey = 'api-diff-lab-cases-v1'

function readInitialCases() {
  if (typeof window === 'undefined') {
    return samples
  }

  const stored = window.localStorage.getItem(storageKey)
  return stored ? (parseDiffCases(stored) ?? samples) : samples
}

export function App() {
  const [cases, setCases] = useState<DiffCase[]>(readInitialCases)
  const [before, setBefore] = useState(cases[0].before)
  const [after, setAfter] = useState(cases[0].after)
  const [activeSample, setActiveSample] = useState(cases[0].id)
  const [caseLabel, setCaseLabel] = useState(cases[0].label)
  const [casePayload, setCasePayload] = useState('')
  const [caseMessage, setCaseMessage] = useState('')
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
  const report = result.error ? '' : buildDiffReport(caseLabel, result.rows)

  useEffect(() => {
    window.localStorage.setItem(storageKey, JSON.stringify(cases))
  }, [cases])

  function loadSample(sampleId: string) {
    const sample = cases.find((item) => item.id === sampleId) ?? cases[0]
    setBefore(sample.before)
    setAfter(sample.after)
    setActiveSample(sample.id)
    setCaseLabel(sample.label)
    setSelectedPath('')
  }

  function saveCase() {
    const nextCase = { id: slugify(caseLabel), label: caseLabel, before, after }
    setCases((current) => [nextCase, ...current.filter((item) => item.id !== nextCase.id)])
    setActiveSample(nextCase.id)
    setCaseMessage('Case saved locally.')
  }

  function importCases() {
    const parsed = parseDiffCases(casePayload)

    if (!parsed) {
      setCaseMessage('Import failed. Paste an exported API Diff Lab case list.')
      return
    }

    setCases(parsed)
    setCaseMessage('Cases imported.')
    loadCase(parsed[0])
  }

  function loadCase(diffCase: DiffCase) {
    setBefore(diffCase.before)
    setAfter(diffCase.after)
    setActiveSample(diffCase.id)
    setCaseLabel(diffCase.label)
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
          {cases.map((sample) => (
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

        <section className="case-tools" aria-label="Case library tools">
          <input value={caseLabel} onChange={(event) => setCaseLabel(event.target.value)} />
          <button type="button" onClick={saveCase}>
            Save case
          </button>
          <button type="button" onClick={() => setCasePayload(JSON.stringify(cases, null, 2))}>
            Export cases
          </button>
          <button type="button" onClick={importCases}>
            Import cases
          </button>
          <textarea
            aria-label="Case JSON"
            placeholder="Paste exported case JSON here."
            value={casePayload}
            onChange={(event) => setCasePayload(event.target.value)}
          />
          {caseMessage ? <p>{caseMessage}</p> : null}
        </section>

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
          {!result.error ? (
            <section className="report-export" aria-label="Contract report export">
              <button type="button" onClick={() => void navigator.clipboard?.writeText(report)}>
                Copy report
              </button>
              <textarea value={report} readOnly />
            </section>
          ) : null}
        </section>
      </section>
    </main>
  )
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}
