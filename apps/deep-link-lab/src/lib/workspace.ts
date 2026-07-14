import { validateDeepLink, type EnvironmentProfile } from './deep-link-lab'

export const workspaceSchema = 'deep-link-lab.workspace/v1' as const

export type DeepLinkWorkspace = {
  schema: typeof workspaceSchema
  name: string
  target: string
  profiles: EnvironmentProfile[]
}

export type WorkspaceImportResult =
  | { ok: true; workspace: DeepLinkWorkspace }
  | { ok: false; message: string }

const idPattern = /^[a-z][a-z0-9-]{0,31}$/
const paramKeyPattern = /^[A-Za-z_][A-Za-z0-9_.-]{0,63}$/
const reservedKeys = new Set(['__proto__', 'constructor', 'prototype'])

export function exportWorkspace(workspace: DeepLinkWorkspace) {
  return JSON.stringify(workspace, null, 2)
}

export function importWorkspace(payload: string): WorkspaceImportResult {
  let parsed: unknown
  try {
    parsed = JSON.parse(payload)
  } catch {
    return failure('Workspace JSON could not be parsed.')
  }

  if (!isPlainRecord(parsed)) return failure('Workspace must be a JSON object.')
  if (!hasOnlyKeys(parsed, ['schema', 'name', 'target', 'profiles'])) {
    return failure('Workspace contains unsupported fields.')
  }
  if (parsed.schema !== workspaceSchema) {
    return failure(`Schema must be “${workspaceSchema}”.`)
  }
  if (!isBoundedText(parsed.name, 80)) return failure('Workspace name is required (max 80).')
  if (typeof parsed.target !== 'string') return failure('Workspace target must be a string.')

  const targetValidation = validateDeepLink(parsed.target)
  if (!targetValidation.ok) return failure(`Workspace target: ${targetValidation.message}`)
  if (!Array.isArray(parsed.profiles) || parsed.profiles.length === 0) {
    return failure('Workspace needs at least one profile.')
  }
  if (parsed.profiles.length > 12) return failure('Workspace supports up to 12 profiles.')

  const profiles: EnvironmentProfile[] = []
  for (const [index, profile] of parsed.profiles.entries()) {
    const result = parseProfile(profile, index)
    if (!result.ok) return result
    profiles.push(result.profile)
  }

  const duplicate = findDuplicate(profiles)
  if (duplicate) return failure(duplicate)

  return {
    ok: true,
    workspace: {
      schema: workspaceSchema,
      name: parsed.name.trim(),
      target: parsed.target.trim(),
      profiles,
    },
  }
}

export function validateProfileId(value: string) {
  return idPattern.test(value)
    ? ''
    : 'Use 1–32 lowercase letters, numbers, or hyphens; start with a letter.'
}

export function validateProfileName(value: string) {
  return isBoundedText(value, 48) ? '' : 'Name is required (max 48 characters).'
}

export function validateParamKey(value: string) {
  return paramKeyPattern.test(value) && !reservedKeys.has(value)
    ? ''
    : 'Start with a letter or underscore; use letters, numbers, dot, _ or -.'
}

function parseProfile(
  value: unknown,
  index: number,
): { ok: true; profile: EnvironmentProfile } | { ok: false; message: string } {
  const label = `Profile ${index + 1}`
  if (!isPlainRecord(value)) return failure(`${label} must be a JSON object.`)
  if (!hasOnlyKeys(value, ['id', 'name', 'params'])) {
    return failure(`${label} contains unsupported fields.`)
  }
  if (typeof value.id !== 'string' || validateProfileId(value.id)) {
    return failure(`${label} has an invalid id.`)
  }
  if (typeof value.name !== 'string' || validateProfileName(value.name)) {
    return failure(`${label} has an invalid name.`)
  }
  if (!isPlainRecord(value.params)) return failure(`${label} params must be a plain object.`)

  const params: Record<string, string> = {}
  for (const [key, paramValue] of Object.entries(value.params)) {
    if (validateParamKey(key)) return failure(`${label} has an invalid param key “${key}”.`)
    if (typeof paramValue !== 'string') return failure(`${label} param “${key}” must be a string.`)
    if (paramValue.length > 500) return failure(`${label} param “${key}” exceeds 500 characters.`)
    params[key] = paramValue
  }

  return { ok: true, profile: { id: value.id, name: value.name.trim(), params } }
}

function findDuplicate(profiles: EnvironmentProfile[]) {
  const ids = new Set<string>()
  const names = new Set<string>()
  for (const profile of profiles) {
    const normalizedName = profile.name.toLowerCase()
    if (ids.has(profile.id)) return `Profile id “${profile.id}” must be unique.`
    if (names.has(normalizedName)) return `Profile name “${profile.name}” must be unique.`
    ids.add(profile.id)
    names.add(normalizedName)
  }
  return ''
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false
  const prototype = Object.getPrototypeOf(value) as unknown
  return prototype === Object.prototype || prototype === null
}

function hasOnlyKeys(value: Record<string, unknown>, allowed: string[]) {
  const allowedKeys = new Set(allowed)
  return Object.keys(value).every((key) => allowedKeys.has(key))
}

function isBoundedText(value: unknown, max: number): value is string {
  return typeof value === 'string' && value.trim().length > 0 && value.trim().length <= max
}

function failure(message: string): { ok: false; message: string } {
  return { ok: false, message }
}
