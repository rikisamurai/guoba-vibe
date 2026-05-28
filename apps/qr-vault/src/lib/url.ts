export type ParsedDeepLink = {
  raw: string
  scheme: string
  path: string
  query: Record<string, string>
  isValid: boolean
}

export type QueryRow = {
  key: string
  value: string
}

export type UrlParts = {
  scheme: string
  path: string
  query: Record<string, string>
}

const SCHEME_SEPARATOR = '://'

export function parseDeepLink(input: string): ParsedDeepLink {
  const raw = input.trim()
  const empty = { raw, scheme: '', path: '', query: {}, isValid: false }
  if (!raw) return empty

  let parsed: URL
  try {
    parsed = new URL(raw)
  } catch {
    return empty
  }

  const scheme = parsed.protocol.replace(/:$/, '')
  const path = extractPath(raw, scheme)
  if (!scheme || !path) return { ...empty, scheme, path }

  const query: Record<string, string> = {}
  parsed.searchParams.forEach((value, key) => {
    query[key] = value
  })

  return { raw, scheme, path, query, isValid: true }
}

export function buildUrlFromParts(parts: UrlParts): string {
  const scheme = parts.scheme.trim().replace(/:$/, '')
  const path = parts.path.trim().replace(/^\/+/, '')
  const searchParams = new URLSearchParams()

  Object.entries(parts.query).forEach(([key, value]) => {
    const normalizedKey = key.trim()
    if (normalizedKey) searchParams.set(normalizedKey, value)
  })

  const queryString = searchParams.toString()
  return `${scheme}${SCHEME_SEPARATOR}${path}${queryString ? `?${queryString}` : ''}`
}

export function normalizeQueryRows(rows: QueryRow[]): Record<string, string> {
  const query: Record<string, string> = {}
  rows.forEach((row) => {
    const key = row.key.trim()
    if (key) query[key] = row.value
  })
  return query
}

export function queryToRows(query: Record<string, string>): QueryRow[] {
  return Object.entries(query).map(([key, value]) => ({ key, value }))
}

export function buildSharePath(input: {
  url: string
  title?: string
  description?: string
}): string {
  const params = new URLSearchParams()
  params.set('url', input.url)
  if (input.title) params.set('title', input.title)
  if (input.description) params.set('description', input.description)
  return `/share?${params.toString()}`
}

function extractPath(raw: string, scheme: string): string {
  const queryStart = raw.indexOf('?')
  const hashStart = raw.indexOf('#')
  const delimiters = [queryStart, hashStart].filter((index) => index !== -1)
  const cut = delimiters.length ? Math.min(...delimiters) : raw.length
  const beforeQueryOrHash = raw.slice(0, cut)
  const separatorIndex = beforeQueryOrHash.indexOf(SCHEME_SEPARATOR)

  if (separatorIndex === -1) {
    return beforeQueryOrHash.slice(scheme.length + 1)
  }

  return beforeQueryOrHash.slice(separatorIndex + SCHEME_SEPARATOR.length)
}
