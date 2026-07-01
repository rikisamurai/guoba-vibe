export function WorkspaceActions({
  name,
  importText,
  exportText,
  message,
  onNameChange,
  onImportTextChange,
  onExport,
  onImport,
  onReset,
}: {
  name: string
  importText: string
  exportText: string
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
        <input value={name} onChange={(event) => onNameChange(event.target.value)} />
      </label>
      <div className="workspace-buttons">
        <button type="button" onClick={onExport}>
          Export JSON
        </button>
        <button type="button" onClick={onImport}>
          Import JSON
        </button>
        <button type="button" onClick={onReset}>
          Restore sample
        </button>
      </div>
      <textarea
        aria-label="Workspace JSON"
        placeholder="Paste exported workspace JSON here, or click Export JSON."
        value={importText || exportText}
        onChange={(event) => onImportTextChange(event.target.value)}
      />
      {message ? <p className="workspace-message">{message}</p> : null}
    </section>
  )
}
