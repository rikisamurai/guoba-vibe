import { Check, Copy, ExternalLink, FlaskConical, Link2, Plus, Trash2 } from 'lucide-react'
import { useMemo, useState } from 'react'

import { initialUrl, profiles } from './deep-link-data'
import {
  buildEnvironmentLinks,
  removeQueryParam,
  readDeepLinkParts,
  upsertQueryParam,
} from './lib/deep-link-lab'
import { ProfileList } from './profile-list'

export function App() {
  const [rawUrl, setRawUrl] = useState(initialUrl)
  const [activeProfileId, setActiveProfileId] = useState(profiles[1].id)
  const [profileDrafts, setProfileDrafts] = useState(profiles)
  const [newParam, setNewParam] = useState({ key: '', value: '' })
  const [copiedId, setCopiedId] = useState('')

  const result = useMemo(() => {
    try {
      return {
        links: buildEnvironmentLinks(rawUrl, profileDrafts),
        parts: readDeepLinkParts(rawUrl),
        error: '',
      }
    } catch {
      return { links: [], parts: null, error: 'Invalid URL' }
    }
  }, [profileDrafts, rawUrl])

  const activeLink = result.links.find((link) => link.id === activeProfileId) ?? result.links[0]

  return (
    <main className="shell">
      <section className="workspace" aria-label="Deep Link Lab workspace">
        <header className="topbar">
          <div>
            <p className="kicker">local matrix</p>
            <h1>Deep Link Lab</h1>
          </div>
          <div className="status-pill">
            <Check size={16} aria-hidden="true" />
            {result.error ? 'Needs URL' : `${result.links.length} targets`}
          </div>
        </header>

        <div className="layout">
          <section className="panel source-panel">
            <div className="panel-title">
              <Link2 size={18} aria-hidden="true" />
              <h2>Source URL</h2>
            </div>
            <label className="field">
              <span>Deep link</span>
              <textarea value={rawUrl} onChange={(event) => setRawUrl(event.target.value)} />
            </label>

            <div className="query-editor" aria-label="Query parameter editor">
              <div className="section-label">Query controls</div>
              {result.parts?.query.map((param) => (
                <div className="query-row" key={param.key}>
                  <input aria-label={`${param.key} key`} value={param.key} readOnly />
                  <input
                    aria-label={`${param.key} value`}
                    value={param.value}
                    onChange={(event) =>
                      setRawUrl(upsertQueryParam(rawUrl, param.key, event.target.value))
                    }
                  />
                  <button
                    type="button"
                    aria-label={`Remove ${param.key}`}
                    onClick={() => setRawUrl(removeQueryParam(rawUrl, param.key))}
                  >
                    <Trash2 size={15} aria-hidden="true" />
                  </button>
                </div>
              ))}
              <form
                className="query-row add-row"
                onSubmit={(event) => {
                  event.preventDefault()
                  if (!newParam.key.trim()) return
                  setRawUrl(upsertQueryParam(rawUrl, newParam.key.trim(), newParam.value))
                  setNewParam({ key: '', value: '' })
                }}
              >
                <input
                  aria-label="New query key"
                  placeholder="key"
                  value={newParam.key}
                  onChange={(event) => setNewParam({ ...newParam, key: event.target.value })}
                />
                <input
                  aria-label="New query value"
                  placeholder="value"
                  value={newParam.value}
                  onChange={(event) => setNewParam({ ...newParam, value: event.target.value })}
                />
                <button type="submit" aria-label="Add query param">
                  <Plus size={15} aria-hidden="true" />
                </button>
              </form>
            </div>

            <div className="parts-grid" aria-label="Parsed deep link">
              <Metric label="Scheme" value={result.parts?.scheme ?? '-'} />
              <Metric label="Path" value={result.parts?.path ?? '-'} />
              <Metric label="Query keys" value={String(result.parts?.query.length ?? 0)} />
            </div>

            <ProfileList
              profiles={profileDrafts}
              activeProfileId={activeProfileId}
              onActiveProfileChange={setActiveProfileId}
              onProfilesChange={setProfileDrafts}
            />
          </section>

          <section className="panel matrix-panel">
            <div className="panel-title">
              <FlaskConical size={18} aria-hidden="true" />
              <h2>Environment Matrix</h2>
            </div>

            {result.error ? (
              <p className="empty-state">{result.error}</p>
            ) : (
              <>
                <div className="preview-tile">
                  <div className="qr-mark" aria-hidden="true">
                    {Array.from({ length: 36 }, (_, index) => (
                      <span
                        key={index}
                        className={index % 4 === 0 || index % 7 === 0 ? 'on' : ''}
                      />
                    ))}
                  </div>
                  <div>
                    <span>Selected target</span>
                    <strong>{activeLink?.name}</strong>
                    <code>{activeLink?.url}</code>
                  </div>
                </div>
                <div className="matrix">
                  {result.links.map((link) => (
                    <article
                      key={link.id}
                      className={`matrix-row ${link.id === activeProfileId ? 'active' : ''}`}
                    >
                      <button
                        type="button"
                        className="link-meta"
                        onClick={() => setActiveProfileId(link.id)}
                      >
                        <span>{link.name}</span>
                        <small>{link.queryCount} params</small>
                      </button>
                      <code>{link.url}</code>
                      <div className="row-actions">
                        <button
                          type="button"
                          onClick={() => {
                            setCopiedId(link.id)
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
        </div>
      </section>
    </main>
  )
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="metric">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  )
}
