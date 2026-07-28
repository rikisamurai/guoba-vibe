import { nanoid8 } from '@/lib/ids'

export type ParsedDeepLink = {
  raw: string
  scheme: string
  path: string
  query: Record<string, string>
  isValid: boolean
  isEmpty: boolean
}

export type QueryRow = {
  id: string
  key: string
  value: string
  enabled: boolean
}

export type UrlParts = {
  scheme: string
  path: string
  query: Record<string, string>
}

export type UrlRowsParts = {
  scheme: string
  path: string
  rows: QueryRow[]
}

const SCHEME_SEPARATOR = '://'
const BLOCKED_OPEN_SCHEMES = new Set([
  'about',
  'blob',
  'data',
  'file',
  'filesystem',
  'javascript',
  'vbscript',
])

export function resolveOpenTarget(input: string): { href: string; mode: 'web' | 'app' } | null {
  const href = input.trim()
  if (!href) return null

  const parsed = parseDeepLink(href)
  const separatorIndex = href.indexOf(SCHEME_SEPARATOR)
  if (!parsed.isValid || separatorIndex <= 0) return null

  const scheme = parsed.scheme.toLowerCase()
  const inputScheme = href.slice(0, separatorIndex).toLowerCase()
  if (inputScheme !== scheme || BLOCKED_OPEN_SCHEMES.has(scheme)) return null

  const mode = scheme === 'http' || scheme === 'https' ? 'web' : 'app'
  return { href, mode }
}

export function parseDeepLink(input: string): ParsedDeepLink {
  const raw = input.trim()
  const empty = { raw, scheme: '', path: '', query: {}, isValid: false, isEmpty: !raw }
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

  return { raw, scheme, path, query, isValid: true, isEmpty: false }
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
    if (!row.enabled) return
    const key = row.key.trim()
    if (key) query[key] = row.value
  })
  return query
}

export function queryToRows(query: Record<string, string>): QueryRow[] {
  return Object.entries(query).map(([key, value]) => createQueryRow({ key, value }))
}

export function createQueryRow(input: Partial<QueryRow> = {}): QueryRow {
  return {
    id: input.id ?? nanoid8(),
    key: input.key ?? '',
    value: input.value ?? '',
    enabled: input.enabled ?? true,
  }
}

export function buildUrlFromQueryRows(parts: UrlRowsParts): string {
  return buildUrlFromParts({
    scheme: parts.scheme,
    path: parts.path,
    query: normalizeQueryRows(parts.rows),
  })
}

export function compactQueryRows(rows: QueryRow[]): QueryRow[] {
  return rows.flatMap((row) => {
    const key = row.key.trim()
    if (!key) return []
    return [{ ...row, key }]
  })
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

export function buildShareUrl(input: {
  origin: string
  pathname: string
  url: string
  title?: string
  description?: string
}): string {
  return `${input.origin}${input.pathname}#${buildSharePath(input)}`
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
