import { Link2 } from 'lucide-react'

import type { EnvironmentProfile } from './lib/deep-link-lab'
import { ProfileList } from './profile-list'
import { QueryEditor } from './query-editor'

type DeepLinkParts = {
  scheme: string
  path: string
  query: Array<{ index: number; key: string; value: string }>
} | null

export function SourcePanel({
  rawUrl,
  parts,
  validationMessage,
  profiles,
  activeProfileId,
  onRawUrlChange,
  onActiveProfileChange,
  onProfilesCommit,
  onFeedback,
}: {
  rawUrl: string
  parts: DeepLinkParts
  validationMessage: string
  profiles: EnvironmentProfile[]
  activeProfileId: string
  onRawUrlChange: (url: string) => void
  onActiveProfileChange: (id: string) => void
  onProfilesCommit: (profiles: EnvironmentProfile[], activeId?: string) => void
  onFeedback: (message: string) => void
}) {
  return (
    <section className="panel source-panel">
      <div className="panel-title">
        <Link2 size={18} aria-hidden="true" />
        <div>
          <p className="eyebrow">Compiler input</p>
          <h2>Source target</h2>
        </div>
      </div>
      <label className="field">
        <span>URL or app deep link</span>
        <textarea
          aria-describedby={!parts ? 'target-validation-message' : undefined}
          aria-invalid={!parts}
          value={rawUrl}
          spellCheck={false}
          placeholder="myapp://checkout/confirm?sku=ABC123"
          onChange={(event) => onRawUrlChange(event.target.value)}
        />
      </label>
      {!parts ? (
        <p id="target-validation-message" className="inline-message" role="status">
          {validationMessage}
        </p>
      ) : null}

      <div className="parts-grid" aria-label="Parsed deep link">
        <Metric label="Scheme" value={parts?.scheme ?? 'Blocked'} />
        <Metric label="Target path" value={parts?.path ?? '—'} />
        <Metric label="Query keys" value={String(parts?.query.length ?? 0)} />
      </div>

      <QueryEditor
        rawUrl={rawUrl}
        query={parts?.query ?? []}
        disabled={!parts}
        onRawUrlChange={onRawUrlChange}
      />

      <ProfileList
        profiles={profiles}
        activeProfileId={activeProfileId}
        onActiveProfileChange={onActiveProfileChange}
        onProfilesCommit={onProfilesCommit}
        onFeedback={onFeedback}
      />
    </section>
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
