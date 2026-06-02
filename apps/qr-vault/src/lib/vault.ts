import type { QRCodeItem, VaultData } from '@/lib/storage'
import { parseDeepLink } from '@/lib/url'

export function searchQrs(data: VaultData, search: string) {
  const normalized = search.trim().toLowerCase()
  if (!normalized) return data.qrs

  return data.qrs.filter((qr) => {
    const parsed = parseDeepLink(qr.url)
    return [
      qr.title,
      qr.description,
      qr.url,
      parsed.scheme,
      parsed.path,
      ...Object.keys(parsed.query),
      ...Object.values(parsed.query),
    ]
      .filter(Boolean)
      .some((value) => value!.toLowerCase().includes(normalized))
  })
}

export function getQrsForCollection(data: VaultData, collectionId: string) {
  const qrIds = new Set(
    data.collectionItems
      .filter((item) => item.collectionId === collectionId)
      .map((item) => item.qrId),
  )
  return data.qrs.filter((qr) => qrIds.has(qr.id))
}

export function getUncategorizedQrs(data: VaultData) {
  const assignedIds = new Set(data.collectionItems.map((item) => item.qrId))
  return data.qrs.filter((qr) => !assignedIds.has(qr.id))
}

export function sortQrsByRecent<T extends Pick<QRCodeItem, 'createdAt' | 'updatedAt'>>(
  qrs: readonly T[],
): T[] {
  return qrs
    .map((qr, index) => ({ qr, index }))
    .sort((a, b) => {
      const updatedDiff = timestamp(b.qr.updatedAt) - timestamp(a.qr.updatedAt)
      if (updatedDiff !== 0) return updatedDiff

      const createdDiff = timestamp(b.qr.createdAt) - timestamp(a.qr.createdAt)
      if (createdDiff !== 0) return createdDiff

      return a.index - b.index
    })
    .map(({ qr }) => qr)
}

function timestamp(value: string) {
  const parsed = Date.parse(value)
  return Number.isNaN(parsed) ? 0 : parsed
}
