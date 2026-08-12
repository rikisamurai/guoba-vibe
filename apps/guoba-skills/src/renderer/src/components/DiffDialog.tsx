import { FileDiff, ShieldCheck, X } from 'lucide-react'

import type { UpdatePreview } from '../../../shared/types'

interface DiffDialogProps {
  preview: UpdatePreview
  unsafe: boolean
  onApply: () => void
  onClose: () => void
}

export function DiffDialog({ preview, unsafe, onApply, onClose }: DiffDialogProps) {
  return (
    <div aria-modal="true" className="dialog-backdrop" role="dialog">
      <section className="diff-dialog">
        <header className="dialog-header">
          <div className="dialog-icon">
            <FileDiff size={19} />
          </div>
          <div>
            <h2>Review exact update</h2>
            <p>
              {preview.skillId} · {preview.remoteRevision.slice(0, 12)}
            </p>
          </div>
          <button
            aria-label="Close update preview"
            className="icon-button"
            onClick={onClose}
            type="button"
          >
            <X size={17} />
          </button>
        </header>
        <div className="revision-bar">
          <span>
            <small>Installed</small>
            {short(preview.baseContentHash)}
          </span>
          <i>→</i>
          <span>
            <small>Prepared upstream</small>
            {short(preview.remoteContentHash)}
          </span>
          <em>{preview.changes.length} files</em>
        </div>
        {unsafe ? (
          <div className="dialog-warning">
            Local content differs from the lock. You can inspect this diff, but Guoba Skills will
            not overwrite those changes.
          </div>
        ) : null}
        <div className="diff-scroll" data-testid="update-diff">
          {preview.changes.map((change) => (
            <FileChange change={change} key={change.path} />
          ))}
          {preview.changes.length === 0 ? (
            <div className="no-diff">
              <ShieldCheck />
              <h3>Content is already identical</h3>
              <p>Applying only refreshes its pinned revision and provenance.</p>
            </div>
          ) : null}
        </div>
        <footer className="dialog-footer">
          <span>
            <ShieldCheck size={14} />
            Apply uses this exact prepared revision
          </span>
          <div>
            <button className="secondary-button" onClick={onClose} type="button">
              Cancel
            </button>
            <button className="primary-button" disabled={unsafe} onClick={onApply} type="button">
              Apply update
            </button>
          </div>
        </footer>
      </section>
    </div>
  )
}

function FileChange({ change }: { change: UpdatePreview['changes'][number] }) {
  return (
    <section className="file-diff">
      <header>
        <span className={`change-kind ${change.kind}`}>{change.kind}</span>
        <strong>{change.path}</strong>
        {change.binary ? <em>binary</em> : null}
      </header>
      <pre>{change.patch ?? 'Binary content changed.'}</pre>
    </section>
  )
}

function short(hash: string): string {
  return hash.replace(/^sha256:/u, '').slice(0, 16)
}
