import type { CollectionItem, QRCodeItem } from '@/lib/storage'
import { compactQueryRows, parseDeepLink, queryToRows, type QueryRow } from '@/lib/url'

type QrDetailDraft = {
  title: string
  description: string
  url: string
  queryRows: QueryRow[]
  collectionIds: string[]
}

export function collectionIdsForQr(items: CollectionItem[], qrId: string): string[] {
  return items.reduce<string[]>((ids, item) => {
    if (item.qrId === qrId) ids.push(item.collectionId)
    return ids
  }, [])
}

export function qrItemToDraft(qr: QRCodeItem, collectionIds: string[]): QrDetailDraft {
  return {
    title: qr.title ?? '',
    description: qr.description ?? '',
    url: qr.url,
    queryRows: qr.queryParams ?? queryToRows(parseDeepLink(qr.url).query),
    collectionIds,
  }
}

export function isQrDraftDirty(draft: QrDetailDraft, savedDraft?: QrDetailDraft): boolean {
  if (!savedDraft) return hasDraftContent(draft)
  return JSON.stringify(normalizeDraft(draft)) !== JSON.stringify(normalizeDraft(savedDraft))
}

function hasDraftContent(draft: QrDetailDraft): boolean {
  return Boolean(
    draft.title.trim() ||
    draft.description.trim() ||
    draft.url.trim() ||
    compactRows(draft.queryRows).length ||
    draft.collectionIds.length,
  )
}

function normalizeDraft(draft: QrDetailDraft) {
  return {
    title: draft.title.trim(),
    description: draft.description.trim(),
    url: draft.url,
    queryRows: compactRows(draft.queryRows),
    collectionIds: Array.from(new Set(draft.collectionIds)).toSorted(),
  }
}

function compactRows(rows: QueryRow[]) {
  return compactQueryRows(rows).map((row) => ({
    key: row.key.trim(),
    value: row.value,
    enabled: row.enabled,
  }))
}
