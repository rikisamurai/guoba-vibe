export type EnvironmentProfile = {
  id: string
  name: string
  params: Record<string, string>
}

export type DeepLinkWorkspace = {
  name: string
  sourceUrl: string
  profiles: EnvironmentProfile[]
}

export type EnvironmentLink = {
  id: string
  name: string
  url: string
  queryCount: number
}

export function buildEnvironmentLinks(
  rawUrl: string,
  profiles: EnvironmentProfile[],
): EnvironmentLink[] {
  const source = new URL(rawUrl)

  return profiles.map((profile) => {
    const target = new URL(source.href)

    for (const [key, value] of Object.entries(profile.params)) {
      target.searchParams.set(key, value)
    }

    return {
      id: profile.id,
      name: profile.name,
      url: target.href,
      queryCount: Array.from(target.searchParams.entries()).length,
    }
  })
}

export function readDeepLinkParts(rawUrl: string) {
  const url = new URL(rawUrl)
  const path = [url.hostname, url.pathname.replace(/^\//, '')].filter(Boolean).join('/')

  return {
    scheme: url.protocol.replace(/:$/, ''),
    path,
    query: Array.from(url.searchParams.entries()).map(([key, value]) => ({ key, value })),
  }
}

export function upsertQueryParam(rawUrl: string, key: string, value: string) {
  const target = new URL(rawUrl)
  target.searchParams.set(key, value)
  return target.href
}

export function removeQueryParam(rawUrl: string, key: string) {
  const target = new URL(rawUrl)
  target.searchParams.delete(key)
  return target.href
}

export function validateDeepLink(
  rawUrl: string,
): { ok: true; message: '' } | { ok: false; message: string } {
  try {
    const url = new URL(rawUrl)
    return url.protocol
      ? { ok: true, message: '' }
      : { ok: false, message: 'Enter a valid URL or app deep link.' }
  } catch {
    return { ok: false, message: 'Enter a valid URL or app deep link.' }
  }
}

export function exportWorkspace(workspace: DeepLinkWorkspace) {
  return JSON.stringify(workspace, null, 2)
}

export function importWorkspace(payload: string): DeepLinkWorkspace | null {
  try {
    const parsed = JSON.parse(payload) as Partial<DeepLinkWorkspace>

    if (
      typeof parsed.name !== 'string' ||
      typeof parsed.sourceUrl !== 'string' ||
      !Array.isArray(parsed.profiles) ||
      !validateDeepLink(parsed.sourceUrl).ok
    ) {
      return null
    }

    const profiles = parsed.profiles.filter(isEnvironmentProfile)

    return profiles.length ? { name: parsed.name, sourceUrl: parsed.sourceUrl, profiles } : null
  } catch {
    return null
  }
}

function isEnvironmentProfile(profile: unknown): profile is EnvironmentProfile {
  if (!profile || typeof profile !== 'object') {
    return false
  }

  const candidate = profile as EnvironmentProfile
  return (
    typeof candidate.id === 'string' &&
    typeof candidate.name === 'string' &&
    Boolean(candidate.params) &&
    Object.values(candidate.params).every((value) => typeof value === 'string')
  )
}
