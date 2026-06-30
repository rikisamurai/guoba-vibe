import type { Dispatch, SetStateAction } from 'react'

import type { EnvironmentProfile } from './lib/deep-link-lab'

export function ProfileList({
  profiles,
  activeProfileId,
  onActiveProfileChange,
  onProfilesChange,
}: {
  profiles: EnvironmentProfile[]
  activeProfileId: string
  onActiveProfileChange: (id: string) => void
  onProfilesChange: Dispatch<SetStateAction<EnvironmentProfile[]>>
}) {
  return (
    <div className="profile-list">
      {profiles.map((profile) => (
        <article
          key={profile.id}
          className={`profile-row ${profile.id === activeProfileId ? 'active' : ''}`}
        >
          <strong>{profile.name}</strong>
          <div className="profile-inputs">
            {Object.entries(profile.params).map(([key, value]) => (
              <label key={key}>
                <span>{key}</span>
                <input
                  value={value}
                  onChange={(event) =>
                    onProfilesChange((current) =>
                      current.map((item) =>
                        item.id === profile.id
                          ? {
                              ...item,
                              params: { ...item.params, [key]: event.target.value },
                            }
                          : item,
                      ),
                    )
                  }
                />
              </label>
            ))}
          </div>
          <button type="button" onClick={() => onActiveProfileChange(profile.id)}>
            Preview
          </button>
        </article>
      ))}
    </div>
  )
}
