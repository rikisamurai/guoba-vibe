import { Check, Copy, ExternalLink, FlaskConical, ShieldCheck, X } from 'lucide-react'
import { useState } from 'react'

import { copyLink, openLink } from './lib/browser-actions'
import type { DeepLinkValidation, EnvironmentLink } from './lib/deep-link-lab'

export function MatrixPanel({
  validation,
  links,
  activeLink,
  activeProfileId,
  onActiveProfileChange,
}: {
  validation: DeepLinkValidation
  links: EnvironmentLink[]
  activeLink?: EnvironmentLink
  activeProfileId: string
  onActiveProfileChange: (id: string) => void
}) {
  const [actionMessage, setActionMessage] = useState('')
  const [busyId, setBusyId] = useState('')

  async function copy(url: string, id: string) {
    setBusyId(id)
    const result = await copyLink(url)
    setBusyId('')
    setActionMessage(result.message)
  }

  function open(url: string) {
    setActionMessage(openLink(url).message)
  }

  return (
    <section className="panel matrix-panel">
      <div className="panel-title">
        <FlaskConical size={18} aria-hidden="true" />
        <div>
          <p className="eyebrow">Compiled output</p>
          <h2>Validation & profile matrix</h2>
        </div>
      </div>

      <ValidationCard validation={validation} profileCount={links.length} />

      {validation.ok && activeLink ? (
        <>
          <div className="preview-tile">
            <div className="preview-heading">
              <span>Selected target</span>
              <strong>{activeLink.name}</strong>
            </div>
            <code>{activeLink.url}</code>
            <div className="preview-actions">
              <button type="button" onClick={() => void copy(activeLink.url, activeLink.id)}>
                <Copy size={15} aria-hidden="true" />
                {busyId === activeLink.id ? 'Copying…' : 'Copy link'}
              </button>
              <button type="button" onClick={() => open(activeLink.url)}>
                <ExternalLink size={15} aria-hidden="true" /> Open safely
              </button>
            </div>
          </div>

          <div className="matrix" aria-label="Compiled profile links">
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
                  <small>
                    {link.queryCount} params · {link.scheme}
                  </small>
                </button>
                <code>{link.url}</code>
                <div className="row-actions">
                  <button
                    type="button"
                    aria-label={`Copy ${link.name} link`}
                    onClick={() => void copy(link.url, link.id)}
                  >
                    <Copy size={15} aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    aria-label={`Open ${link.name} link`}
                    onClick={() => open(link.url)}
                  >
                    <ExternalLink size={15} aria-hidden="true" />
                  </button>
                </div>
              </article>
            ))}
          </div>
        </>
      ) : (
        <p className="empty-state">
          {validation.message} Output is paused until the target is safe.
        </p>
      )}

      <p className="action-message" aria-live="polite">
        {actionMessage}
      </p>
    </section>
  )
}

function ValidationCard({
  validation,
  profileCount,
}: {
  validation: DeepLinkValidation
  profileCount: number
}) {
  const rows = [
    ['URL format', validation.ok],
    ['Scheme policy', validation.ok],
    ['Credentials absent', validation.ok],
    ['Profiles compiled', validation.ok && profileCount > 0],
  ] as const

  return (
    <div className={`validation-card ${validation.ok ? 'valid' : 'invalid'}`}>
      <div className="validation-title">
        <ShieldCheck size={17} aria-hidden="true" />
        <strong>{validation.ok ? 'Safe to use' : 'Validation stopped'}</strong>
      </div>
      <div className="validation-rows">
        {rows.map(([label, valid]) => (
          <div key={label}>
            <span>{label}</span>
            <strong>{valid ? 'VALID' : 'BLOCKED'}</strong>
            {valid ? <Check size={14} aria-hidden="true" /> : <X size={14} aria-hidden="true" />}
          </div>
        ))}
      </div>
    </div>
  )
}
