import { Copy, ExternalLink, FlaskConical } from 'lucide-react'

import type { EnvironmentLink } from './lib/deep-link-lab'

export function MatrixPanel({
  error,
  links,
  activeLink,
  activeProfileId,
  copiedId,
  onActiveProfileChange,
  onCopiedChange,
}: {
  error: string
  links: EnvironmentLink[]
  activeLink?: EnvironmentLink
  activeProfileId: string
  copiedId: string
  onActiveProfileChange: (id: string) => void
  onCopiedChange: (id: string) => void
}) {
  return (
    <section className="panel matrix-panel">
      <div className="panel-title">
        <FlaskConical size={18} aria-hidden="true" />
        <h2>Environment Matrix</h2>
      </div>

      {error ? (
        <p className="empty-state">{error}</p>
      ) : (
        <>
          <div className="preview-tile">
            <QrMark />
            <div>
              <span>Selected target</span>
              <strong>{activeLink?.name}</strong>
              <code>{activeLink?.url}</code>
            </div>
          </div>
          <div className="matrix">
            {links.map((link) => (
              <article
                key={link.id}
                className={`matrix-row ${link.id === activeProfileId ? 'active' : ''}`}
              >
                <button
                  type="button"
                  className="link-meta"
                  onClick={() => onActiveProfileChange(link.id)}
                >
                  <span>{link.name}</span>
                  <small>{link.queryCount} params</small>
                </button>
                <code>{link.url}</code>
                <div className="row-actions">
                  <button
                    type="button"
                    onClick={() => {
                      onCopiedChange(link.id)
                      void navigator.clipboard?.writeText(link.url)
                    }}
                  >
                    <Copy size={16} aria-hidden="true" />
                    {copiedId === link.id ? 'Copied' : 'Copy'}
                  </button>
                  <a href={link.url}>
                    <ExternalLink size={16} aria-hidden="true" />
                    Open
                  </a>
                </div>
              </article>
            ))}
          </div>
        </>
      )}
    </section>
  )
}

function QrMark() {
  return (
    <div className="qr-mark" aria-hidden="true">
      {Array.from({ length: 36 }, (_, index) => (
        <span key={index} className={index % 4 === 0 || index % 7 === 0 ? 'on' : ''} />
      ))}
    </div>
  )
}
