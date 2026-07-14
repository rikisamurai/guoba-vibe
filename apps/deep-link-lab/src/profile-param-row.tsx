import { Trash2 } from 'lucide-react'
import { useState } from 'react'

import type { EnvironmentProfile } from './lib/deep-link-lab'
import { removeProfileParam, saveProfileParam, type ProfileResult } from './lib/profile-operations'

export function ProfileParamRow({
  profile,
  profiles,
  paramKey,
  value,
  onApply,
}: {
  profile: EnvironmentProfile
  profiles: EnvironmentProfile[]
  paramKey: string
  value: string
  onApply: (result: ProfileResult, activeId?: string, message?: string) => boolean
}) {
  const [draftKey, setDraftKey] = useState(paramKey)

  function commitKey() {
    const result = saveProfileParam(profiles, profile.id, paramKey, draftKey, value)
    if (!onApply(result, undefined, 'Parameter key updated.')) setDraftKey(paramKey)
  }

  return (
    <div className="param-row">
      <input
        aria-label={`${profile.name} parameter key ${paramKey}`}
        value={draftKey}
        maxLength={64}
        spellCheck={false}
        onChange={(event) => setDraftKey(event.target.value)}
        onBlur={commitKey}
      />
      <input
        aria-label={`${profile.name} parameter ${paramKey} value`}
        value={value}
        maxLength={500}
        onChange={(event) =>
          onApply(saveProfileParam(profiles, profile.id, paramKey, paramKey, event.target.value))
        }
      />
      <button
        type="button"
        className="icon-button danger"
        aria-label={`Remove ${paramKey} from ${profile.name}`}
        onClick={() =>
          onApply(
            removeProfileParam(profiles, profile.id, paramKey),
            undefined,
            'Profile parameter removed.',
          )
        }
      >
        <Trash2 size={14} aria-hidden="true" />
      </button>
    </div>
  )
}
