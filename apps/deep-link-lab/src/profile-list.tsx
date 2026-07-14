import { Plus } from 'lucide-react'

import type { EnvironmentProfile } from './lib/deep-link-lab'
import { addProfile, type ProfileResult } from './lib/profile-operations'
import { ProfileCard } from './profile-card'

type ProfileListProps = {
  profiles: EnvironmentProfile[]
  activeProfileId: string
  onActiveProfileChange: (id: string) => void
  onProfilesCommit: (profiles: EnvironmentProfile[], activeId?: string) => void
  onFeedback: (message: string) => void
}

export function ProfileList(props: ProfileListProps) {
  const { profiles, activeProfileId, onProfilesCommit, onFeedback } = props

  function apply(result: ProfileResult, activeId?: string, message?: string) {
    if (!result.ok) {
      onFeedback(result.message)
      return false
    }
    onProfilesCommit(result.profiles, activeId)
    if (message) onFeedback(message)
    return true
  }

  function createProfile() {
    const result = addProfile(profiles)
    const newProfile = result.ok ? result.profiles.at(-1) : undefined
    apply(result, newProfile?.id, 'Profile added. Rename it when ready.')
  }

  return (
    <section className="profile-section" aria-labelledby="profiles-heading">
      <div className="section-heading">
        <div>
          <span id="profiles-heading">Profile overrides</span>
          <small>Compiled into every target</small>
        </div>
        <button type="button" className="secondary-button" onClick={createProfile}>
          <Plus size={14} aria-hidden="true" /> Add profile
        </button>
      </div>
      <div className="profile-list">
        {profiles.map((profile) => (
          <ProfileCard
            key={`${profile.id}:${profile.name}`}
            profile={profile}
            profiles={profiles}
            active={profile.id === activeProfileId}
            canRemove={profiles.length > 1}
            onSelect={() => props.onActiveProfileChange(profile.id)}
            onApply={apply}
          />
        ))}
      </div>
    </section>
  )
}
