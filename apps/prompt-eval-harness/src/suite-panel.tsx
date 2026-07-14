import { ClipboardList, Download, RotateCcw, Scale, TerminalSquare, Upload } from 'lucide-react'

import type { EvalSuite } from './lib/prompt-eval'

type SuitePanelProps = {
  suite: EvalSuite
  errors: string[]
  payload: string
  message: string
  onPayloadChange: (payload: string) => void
  onNormalize: () => void
  onExport: () => void
  onImport: () => void
  onReset: () => void
}

export function SuitePanel(props: SuitePanelProps) {
  return (
    <section className="suite-panel" aria-label="Eval suite contract">
      <PanelTitle icon={ClipboardList} title="Suite contract" />
      <p className="prompt">{props.suite.task.prompt}</p>
      <ol className="outcomes">
        {props.suite.task.expectedOutcome.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ol>

      <section className={`suite-status ${props.errors.length ? 'invalid' : 'valid'}`}>
        <strong>
          {props.errors.length ? `${props.errors.length} blocking issues` : 'Ready to rank'}
        </strong>
        {props.errors.map((error) => (
          <p key={error}>{error}</p>
        ))}
      </section>

      <div className="suite-actions">
        <button type="button" onClick={props.onNormalize}>
          <Scale size={15} aria-hidden="true" />
          Normalize weights
        </button>
        <button type="button" onClick={props.onReset}>
          <RotateCcw size={15} aria-hidden="true" />
          Reset sample
        </button>
      </div>

      <details className="suite-transfer">
        <summary>Import / export suite JSON</summary>
        <textarea
          aria-label="Suite JSON"
          value={props.payload}
          onChange={(event) => props.onPayloadChange(event.target.value)}
          placeholder="Export the active suite or paste a complete suite JSON document."
          spellCheck={false}
        />
        <div>
          <button type="button" onClick={props.onExport}>
            <Download size={15} aria-hidden="true" /> Export
          </button>
          <button type="button" onClick={props.onImport}>
            <Upload size={15} aria-hidden="true" /> Import
          </button>
        </div>
      </details>

      <p className="suite-message" role="status" aria-live="polite">
        {props.message || 'Only suites that pass every structural check are persisted.'}
      </p>
      <code className="cli-command">
        <TerminalSquare size={15} aria-hidden="true" />
        pnpm --filter prompt-eval-harness eval [suite.json]
      </code>
    </section>
  )
}

function PanelTitle({ icon: Icon, title }: { icon: typeof ClipboardList; title: string }) {
  return (
    <div className="panel-title">
      <Icon size={17} aria-hidden="true" />
      <h2>{title}</h2>
    </div>
  )
}
