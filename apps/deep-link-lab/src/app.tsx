import { Check, Copy, FlaskConical, Link2 } from 'lucide-react'
import { useMemo, useState } from 'react'

import {
  buildEnvironmentLinks,
  readDeepLinkParts,
  type EnvironmentProfile,
} from './lib/deep-link-lab'

const profiles: EnvironmentProfile[] = [
  { id: 'prod', name: 'Production', params: { env: 'prod', source: 'qr' } },
  { id: 'staging', name: 'Staging', params: { env: 'staging', source: 'lab' } },
  { id: 'preview', name: 'Preview', params: { env: 'preview', source: 'lab' } },
]

const initialUrl = 'xhsdiscover://item/detail?id=42&env=prod'

export function App() {
  const [rawUrl, setRawUrl] = useState(initialUrl)

  const result = useMemo(() => {
    try {
      return {
        links: buildEnvironmentLinks(rawUrl, profiles),
        parts: readDeepLinkParts(rawUrl),
        error: '',
      }
    } catch {
      return { links: [], parts: null, error: 'Invalid URL' }
    }
  }, [rawUrl])

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
            Static MVP
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

            <div className="parts-grid" aria-label="Parsed deep link">
              <Metric label="Scheme" value={result.parts?.scheme ?? '-'} />
              <Metric label="Path" value={result.parts?.path ?? '-'} />
              <Metric label="Query keys" value={String(result.parts?.query.length ?? 0)} />
            </div>

            <div className="profile-list">
              {profiles.map((profile) => (
                <article key={profile.id} className="profile-row">
                  <strong>{profile.name}</strong>
                  <code>{formatParams(profile.params)}</code>
                </article>
              ))}
            </div>
          </section>

          <section className="panel matrix-panel">
            <div className="panel-title">
              <FlaskConical size={18} aria-hidden="true" />
              <h2>Environment Matrix</h2>
            </div>

            {result.error ? (
              <p className="empty-state">{result.error}</p>
            ) : (
              <div className="matrix">
                {result.links.map((link) => (
                  <article key={link.id} className="matrix-row">
                    <div>
                      <span>{link.name}</span>
                      <small>{link.queryCount} params</small>
                    </div>
                    <code>{link.url}</code>
                    <button
                      type="button"
                      onClick={() => void navigator.clipboard?.writeText(link.url)}
                    >
                      <Copy size={16} aria-hidden="true" />
                      Copy
                    </button>
                  </article>
                ))}
              </div>
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

function formatParams(params: Record<string, string>) {
  return Object.entries(params)
    .map(([key, value]) => `${key}=${value}`)
    .join('&')
}
