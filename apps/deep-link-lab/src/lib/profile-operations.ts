import type { EnvironmentProfile } from './deep-link-lab'
import { validateParamKey, validateProfileId, validateProfileName } from './workspace'

export type ProfileResult =
  | { ok: true; profiles: EnvironmentProfile[] }
  | { ok: false; message: string }

export function addProfile(profiles: EnvironmentProfile[]): ProfileResult {
  if (profiles.length >= 12) return failed('A workspace supports up to 12 profiles.')

  let number = profiles.length + 1
  while (profiles.some((profile) => profile.id === `profile-${number}`)) number += 1
  const profile = { id: `profile-${number}`, name: `Profile ${number}`, params: {} }
  return succeeded([...profiles, profile])
}

export function updateProfileIdentity(
  profiles: EnvironmentProfile[],
  currentId: string,
  nextId: string,
  nextName: string,
): ProfileResult {
  const idError = validateProfileId(nextId)
  if (idError) return failed(idError)
  const nameError = validateProfileName(nextName)
  if (nameError) return failed(nameError)
  if (profiles.some((profile) => profile.id !== currentId && profile.id === nextId)) {
    return failed(`Profile id “${nextId}” is already in use.`)
  }
  if (
    profiles.some(
      (profile) =>
        profile.id !== currentId && profile.name.toLowerCase() === nextName.trim().toLowerCase(),
    )
  ) {
    return failed(`Profile name “${nextName.trim()}” is already in use.`)
  }

  return succeeded(
    profiles.map((profile) =>
      profile.id === currentId ? { ...profile, id: nextId, name: nextName.trim() } : profile,
    ),
  )
}

export function removeProfile(profiles: EnvironmentProfile[], id: string): ProfileResult {
  if (profiles.length === 1) return failed('A workspace must keep at least one profile.')
  return succeeded(profiles.filter((profile) => profile.id !== id))
}

export function saveProfileParam(
  profiles: EnvironmentProfile[],
  profileId: string,
  previousKey: string | null,
  nextKey: string,
  value: string,
): ProfileResult {
  const key = nextKey.trim()
  const keyError = validateParamKey(key)
  if (keyError) return failed(keyError)
  if (value.length > 500) return failed('Parameter values can contain at most 500 characters.')

  const profile = profiles.find((item) => item.id === profileId)
  if (!profile) return failed('The selected profile no longer exists.')
  if (key !== previousKey && Object.hasOwn(profile.params, key)) {
    return failed(`Parameter “${key}” already exists in ${profile.name}.`)
  }

  return succeeded(
    profiles.map((item) => {
      if (item.id !== profileId) return item
      const params = { ...item.params }
      if (previousKey && previousKey !== key) delete params[previousKey]
      params[key] = value
      return { ...item, params }
    }),
  )
}

export function removeProfileParam(
  profiles: EnvironmentProfile[],
  profileId: string,
  key: string,
): ProfileResult {
  return succeeded(
    profiles.map((profile) => {
      if (profile.id !== profileId) return profile
      const params = { ...profile.params }
      delete params[key]
      return { ...profile, params }
    }),
  )
}

function succeeded(profiles: EnvironmentProfile[]): ProfileResult {
  return { ok: true, profiles }
}

function failed(message: string): ProfileResult {
  return { ok: false, message }
}
