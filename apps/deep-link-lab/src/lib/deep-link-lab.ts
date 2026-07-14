export type EnvironmentProfile = {
  id: string
  name: string
  params: Record<string, string>
}

export type EnvironmentLink = {
  id: string
  name: string
  url: string
  queryCount: number
  scheme: string
}

export type DeepLinkValidation =
  | { ok: true; message: ''; scheme: string }
  | { ok: false; message: string; scheme: '' }

export type DeepLinkOpenPolicy = { allowed: boolean; message: string }

const openSchemeAllowlist = new Set(['http', 'https', 'xhsdiscover'])
const schemePattern = /^[a-z][a-z0-9+.-]*$/i

export function validateDeepLink(rawUrl: string): DeepLinkValidation {
  const target = rawUrl.trim()
  if (!target) return invalid('Enter a URL or app deep link.')

  try {
    const url = new URL(target)
    const scheme = url.protocol.slice(0, -1).toLowerCase()

    if (!schemePattern.test(scheme)) return invalid('Enter a valid URL or app deep link.')
    if (url.username || url.password) {
      return invalid('Credentials are not allowed in deep links.')
    }
    if (scheme !== 'http' && scheme !== 'https' && (!target.includes('://') || !url.hostname)) {
      return invalid('Custom app links must use scheme://target/path.')
    }

    return { ok: true, message: '', scheme }
  } catch {
    return invalid('Enter a valid URL or app deep link.')
  }
}

export function readOpenPolicy(validation: DeepLinkValidation): DeepLinkOpenPolicy {
  if (!validation.ok) return { allowed: false, message: validation.message }
  if (openSchemeAllowlist.has(validation.scheme)) {
    return { allowed: true, message: `Open is enabled for the “${validation.scheme}” scheme.` }
  }
  return {
    allowed: false,
    message: `Open is disabled for the “${validation.scheme}” scheme. Copy the compiled link to use it elsewhere.`,
  }
}

export function buildEnvironmentLinks(
  rawUrl: string,
  profiles: EnvironmentProfile[],
): EnvironmentLink[] {
  const validation = validateDeepLink(rawUrl)
  if (!validation.ok) return []

  const source = new URL(rawUrl.trim())
  return profiles.map((profile) => {
    const target = new URL(source.href)
    for (const [key, value] of Object.entries(profile.params)) {
      target.searchParams.set(key, value)
    }
    return {
      id: profile.id,
      name: profile.name,
      url: target.href,
      queryCount: Array.from(target.searchParams).length,
      scheme: validation.scheme,
    }
  })
}

export function readDeepLinkParts(rawUrl: string) {
  if (!validateDeepLink(rawUrl).ok) return null
  const url = new URL(rawUrl.trim())
  const path = [url.hostname, url.pathname.replace(/^\//, '')].filter(Boolean).join('/')

  return {
    scheme: url.protocol.slice(0, -1),
    path,
    query: Array.from(url.searchParams, ([key, value], index) => ({ index, key, value })),
  }
}

export function appendQueryParam(rawUrl: string, key: string, value: string) {
  if (!validateDeepLink(rawUrl).ok || !key.trim()) return rawUrl
  const target = new URL(rawUrl.trim())
  target.searchParams.append(key.trim(), value)
  return target.href
}

export function updateQueryParamAt(rawUrl: string, index: number, value: string) {
  if (!validateDeepLink(rawUrl).ok) return rawUrl
  const target = new URL(rawUrl.trim())
  const entries = Array.from(target.searchParams)
  const entry = entries[index]
  if (!entry) return rawUrl
  entries[index] = [entry[0], value]
  replaceQuery(target, entries)
  return target.href
}

export function removeQueryParamAt(rawUrl: string, index: number) {
  if (!validateDeepLink(rawUrl).ok) return rawUrl
  const target = new URL(rawUrl.trim())
  const entries = Array.from(target.searchParams)
  if (!entries[index]) return rawUrl
  entries.splice(index, 1)
  replaceQuery(target, entries)
  return target.href
}

function replaceQuery(target: URL, entries: Array<[string, string]>) {
  target.search = ''
  for (const [key, value] of entries) target.searchParams.append(key, value)
}

function invalid(message: string): DeepLinkValidation {
  return { ok: false, message, scheme: '' }
}
