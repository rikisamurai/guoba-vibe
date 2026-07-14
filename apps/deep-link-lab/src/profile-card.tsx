import { Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'

import type { EnvironmentProfile } from './lib/deep-link-lab'
import {
  removeProfile,
  saveProfileParam,
  updateProfileIdentity,
  type ProfileResult,
} from './lib/profile-operations'
import { ProfileParamRow } from './profile-param-row'

type ProfileCardProps = {
  profile: EnvironmentProfile
  profiles: EnvironmentProfile[]
  active: boolean
  canRemove: boolean
  onSelect: () => void
  onApply: (result: ProfileResult, activeId?: string, message?: string) => boolean
}

export function ProfileCard(props: ProfileCardProps) {
  const { profile, profiles, active, canRemove, onSelect, onApply } = props
  const [identity, setIdentity] = useState({ id: profile.id, name: profile.name })
  const [newParam, setNewParam] = useState({ key: '', value: '' })

  function commitIdentity() {
    const result = updateProfileIdentity(profiles, profile.id, identity.id, identity.name)
    if (!onApply(result, identity.id, 'Profile identity updated.')) {
      setIdentity({ id: profile.id, name: profile.name })
    }
  }

  function addParam() {
    const result = saveProfileParam(profiles, profile.id, null, newParam.key, newParam.value)
    if (onApply(result, undefined, 'Profile parameter added.')) {
      setNewParam({ key: '', value: '' })
    }
  }

  return (
    <article className={`profile-row ${active ? 'active' : ''}`}>
      <div className="profile-header">
        <button type="button" className="profile-select" aria-expanded={active} onClick={onSelect}>
          <span>{profile.name}</span>
          <small>{Object.keys(profile.params).length} overrides</small>
        </button>
        <button
          type="button"
          className="icon-button danger"
          aria-label={`Delete ${profile.name}`}
          disabled={!canRemove}
          onClick={() =>
            onApply(removeProfile(profiles, profile.id), undefined, 'Profile deleted.')
          }
        >
          <Trash2 size={15} aria-hidden="true" />
        </button>
      </div>

      {active ? (
        <div className="profile-editor">
          <div className="identity-grid">
            <label>
              <span>Name</span>
              <input
                value={identity.name}
                maxLength={48}
                onChange={(event) =>
                  setIdentity((current) => ({ ...current, name: event.target.value }))
                }
                onBlur={commitIdentity}
              />
            </label>
            <label>
              <span>Stable id</span>
              <input
                value={identity.id}
                maxLength={32}
                spellCheck={false}
                onChange={(event) =>
                  setIdentity((current) => ({ ...current, id: event.target.value }))
                }
                onBlur={commitIdentity}
              />
            </label>
          </div>
          <div className="profile-params">
            {Object.entries(profile.params).map(([key, value]) => (
              <ProfileParamRow
                key={key}
                profile={profile}
                profiles={profiles}
                paramKey={key}
                value={value}
                onApply={onApply}
              />
            ))}
            <form
              className="param-row add-param-row"
              onSubmit={(event) => {
                event.preventDefault()
                addParam()
              }}
            >
              <input
                aria-label={`New parameter key for ${profile.name}`}
                placeholder="parameter_key"
                value={newParam.key}
                onChange={(event) =>
                  setNewParam((current) => ({ ...current, key: event.target.value }))
                }
              />
              <input
                aria-label={`New parameter value for ${profile.name}`}
                placeholder="value"
                maxLength={500}
                value={newParam.value}
                onChange={(event) =>
                  setNewParam((current) => ({ ...current, value: event.target.value }))
                }
              />
              <button
                type="submit"
                className="icon-button"
                aria-label={`Add parameter to ${profile.name}`}
              >
                <Plus size={15} aria-hidden="true" />
              </button>
            </form>
          </div>
        </div>
      ) : null}
    </article>
  )
}
