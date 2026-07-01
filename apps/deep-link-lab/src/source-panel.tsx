import { Link2, Plus, Trash2 } from 'lucide-react'
import { useState, type Dispatch, type SetStateAction } from 'react'

import { removeQueryParam, upsertQueryParam, type EnvironmentProfile } from './lib/deep-link-lab'
import { ProfileList } from './profile-list'

type DeepLinkParts = {
  scheme: string
  path: string
  query: Array<{ key: string; value: string }>
} | null

export function SourcePanel({
  rawUrl,
  parts,
  profiles,
  activeProfileId,
  onRawUrlChange,
  onActiveProfileChange,
  onProfilesChange,
}: {
  rawUrl: string
  parts: DeepLinkParts
  profiles: EnvironmentProfile[]
  activeProfileId: string
  onRawUrlChange: (url: string) => void
  onActiveProfileChange: (id: string) => void
  onProfilesChange: Dispatch<SetStateAction<EnvironmentProfile[]>>
}) {
  return (
    <section className="panel source-panel">
      <div className="panel-title">
        <Link2 size={18} aria-hidden="true" />
        <h2>Source URL</h2>
      </div>
      <label className="field">
        <span>Deep link</span>
        <textarea value={rawUrl} onChange={(event) => onRawUrlChange(event.target.value)} />
      </label>

      <QueryEditor rawUrl={rawUrl} query={parts?.query ?? []} onRawUrlChange={onRawUrlChange} />

      <div className="parts-grid" aria-label="Parsed deep link">
        <Metric label="Scheme" value={parts?.scheme ?? '-'} />
        <Metric label="Path" value={parts?.path ?? '-'} />
        <Metric label="Query keys" value={String(parts?.query.length ?? 0)} />
      </div>

      <ProfileList
        profiles={profiles}
        activeProfileId={activeProfileId}
        onActiveProfileChange={onActiveProfileChange}
        onProfilesChange={onProfilesChange}
      />
    </section>
  )
}

function QueryEditor({
  rawUrl,
  query,
  onRawUrlChange,
}: {
  rawUrl: string
  query: Array<{ key: string; value: string }>
  onRawUrlChange: (url: string) => void
}) {
  const [newParam, setNewParam] = useState({ key: '', value: '' })

  return (
    <div className="query-editor" aria-label="Query parameter editor">
      <div className="section-label">Query controls</div>
      {query.map((param) => (
        <div className="query-row" key={param.key}>
          <input aria-label={`${param.key} key`} value={param.key} readOnly />
          <input
            aria-label={`${param.key} value`}
            value={param.value}
            onChange={(event) =>
              onRawUrlChange(upsertQueryParam(rawUrl, param.key, event.target.value))
            }
          />
          <button
            type="button"
            aria-label={`Remove ${param.key}`}
            onClick={() => onRawUrlChange(removeQueryParam(rawUrl, param.key))}
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
          onRawUrlChange(upsertQueryParam(rawUrl, newParam.key.trim(), newParam.value))
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
