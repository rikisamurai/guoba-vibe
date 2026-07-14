import { FileJson2, RotateCcw, Upload } from 'lucide-react'

export function WorkspaceActions({
  name,
  importText,
  message,
  onNameChange,
  onImportTextChange,
  onExport,
  onImport,
  onReset,
}: {
  name: string
  importText: string
  message: string
  onNameChange: (name: string) => void
  onImportTextChange: (value: string) => void
  onExport: () => void
  onImport: () => void
  onReset: () => void
}) {
  return (
    <section className="workspace-actions" aria-label="Workspace actions">
      <label className="workspace-name">
        <span>Workspace</span>
        <input
          required
          maxLength={80}
          value={name}
          onChange={(event) => onNameChange(event.target.value)}
        />
      </label>
      <div className="workspace-buttons">
        <button type="button" onClick={onExport}>
          <FileJson2 size={14} aria-hidden="true" /> Export
        </button>
        <button type="button" onClick={onReset}>
          <RotateCcw size={14} aria-hidden="true" /> Restore sample
        </button>
      </div>
      <details className="json-drawer">
        <summary>Workspace JSON</summary>
        <textarea
          aria-label="Workspace JSON"
          spellCheck={false}
          value={importText}
          onChange={(event) => onImportTextChange(event.target.value)}
        />
        <button type="button" onClick={onImport}>
          <Upload size={14} aria-hidden="true" /> Validate & import
        </button>
      </details>
      <p className="workspace-message" aria-live="polite">
        {message}
      </p>
    </section>
  )
}
