import { Download, RotateCcw, Save, Trash2, Upload } from 'lucide-react'

import type { DiffCase } from './lib/api-diff'

type CaseLibraryProps = {
  cases: DiffCase[]
  activeId: string
  label: string
  payload: string
  message: string
  dirty: boolean
  storageError: string
  storageBlocked: boolean
  onSelect: (id: string) => void
  onLabelChange: (label: string) => void
  onPayloadChange: (payload: string) => void
  onSave: () => void
  onReset: () => void
  onDelete: () => void
  onExport: () => void
  onImport: () => void
  onResetLibrary: () => void
}

export function CaseLibrary(props: CaseLibraryProps) {
  return (
    <section className="case-library" aria-label="Contract case library">
      <div className="case-primary">
        <label>
          <span>Contract</span>
          <select value={props.activeId} onChange={(event) => props.onSelect(event.target.value)}>
            {props.cases.map((item) => (
              <option key={item.id} value={item.id}>
                {item.label}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>Snapshot name</span>
          <input
            value={props.label}
            onChange={(event) => props.onLabelChange(event.target.value)}
            placeholder="Checkout response v2"
          />
        </label>
        <div className="case-actions">
          <Action
            icon={Save}
            label="Save snapshot"
            onClick={props.onSave}
            disabled={props.storageBlocked}
            primary
          />
          <Action icon={RotateCcw} label="Reset" onClick={props.onReset} />
          <Action icon={Trash2} label="Delete" onClick={props.onDelete} />
        </div>
      </div>

      <details className="transfer-panel">
        <summary>Import / export case library</summary>
        <textarea
          aria-label="Case library JSON"
          placeholder="Export the library or paste a previously exported JSON list."
          value={props.payload}
          onChange={(event) => props.onPayloadChange(event.target.value)}
          spellCheck={false}
        />
        <div className="transfer-actions">
          <Action icon={Download} label="Export" onClick={props.onExport} />
          <Action icon={Upload} label="Import" onClick={props.onImport} />
          {props.storageBlocked ? (
            <Action icon={RotateCcw} label="Reset invalid library" onClick={props.onResetLibrary} />
          ) : null}
        </div>
      </details>

      <div className="library-state" role="status" aria-live="polite">
        <strong className={props.dirty ? 'dirty' : 'saved'}>
          {props.dirty ? 'UNSAVED EDITOR CHANGES' : 'SNAPSHOT MATCHES EDITOR'}
        </strong>
        <p className="case-message" role="status" aria-live="polite">
          {props.message || 'Import replaces the current library after validation.'}
        </p>
      </div>
      {props.storageError ? (
        <p className="storage-error" role="alert">
          {props.storageError}
        </p>
      ) : null}
    </section>
  )
}

function Action({
  icon: Icon,
  label,
  onClick,
  disabled = false,
  primary = false,
}: {
  icon: typeof Save
  label: string
  onClick: () => void
  disabled?: boolean
  primary?: boolean
}) {
  return (
    <button
      type="button"
      className={primary ? 'primary' : ''}
      onClick={onClick}
      disabled={disabled}
    >
      <Icon size={15} aria-hidden="true" />
      {label}
    </button>
  )
}
