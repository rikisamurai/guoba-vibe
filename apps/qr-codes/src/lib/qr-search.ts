import { parseUrl } from '@/lib/url-parse'

export type QrSearchRow = {
  title: string
  description: string | null
  url: string
}

export function qrMatchesSearch(row: QrSearchRow, search: string): boolean {
  const normalized = search.trim().toLowerCase()
  if (!normalized) return true

  const parsed = parseUrl(row.url)
  return [
    row.title,
    row.description,
    row.url,
    parsed.scheme,
    parsed.path,
    ...Object.keys(parsed.query),
    ...Object.values(parsed.query),
  ]
    .filter(Boolean)
    .some((value) => value!.toLowerCase().includes(normalized))
}
