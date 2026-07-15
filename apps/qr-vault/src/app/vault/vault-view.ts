import type { VaultDocument } from '@/app/vault/vault-document'
import type {
  CollectionView,
  ListQrsInput,
  QrScope,
  QrView,
  VaultCounts,
  VaultView,
} from '@/app/vault/vault-types'
import { parseDeepLink } from '@/lib/url'

export function buildVaultView(document: VaultDocument): VaultView {
  const collectionTitleById = new Map(
    document.collections.map((collection) => [collection.id, collection.title]),
  )
  const qrs = Object.freeze(
    document.qrs.map((qr) => {
      const collectionIds = document.collectionItems
        .filter((item) => item.qrId === qr.id)
        .map((item) => item.collectionId)
      const collectionTitles = collectionIds.flatMap((id) => {
        const title = collectionTitleById.get(id)
        return title ? [title] : []
      })
      return Object.freeze({
        id: qr.id,
        title: cloneAndFreeze(qr.title),
        description: cloneAndFreeze(qr.description),
        url: qr.url,
        queryParams: qr.queryParams
          ? Object.freeze(qr.queryParams.map((row) => cloneAndFreeze(row)))
          : undefined,
        createdAt: cloneAndFreeze(qr.createdAt),
        updatedAt: cloneAndFreeze(qr.updatedAt),
        collectionIds: Object.freeze(collectionIds),
        collectionTitles: Object.freeze(collectionTitles),
      })
    }),
  )
  const qrById = firstById(qrs)
  const collectionCounts = document.collectionItems.reduce<Map<string, number>>((counts, item) => {
    counts.set(item.collectionId, (counts.get(item.collectionId) ?? 0) + 1)
    return counts
  }, new Map())
  const collections = Object.freeze(
    document.collections.map((collection) =>
      Object.freeze({
        id: collection.id,
        title: collection.title,
        description: cloneAndFreeze(collection.description),
        createdAt: cloneAndFreeze(collection.createdAt),
        updatedAt: cloneAndFreeze(collection.updatedAt),
        qrCount: collectionCounts.get(collection.id) ?? 0,
      }),
    ),
  )
  const collectionById = firstById(collections)
  const collectionViews = new Map<string, CollectionView>()
  collections.forEach((collection) => {
    if (collectionViews.has(collection.id)) return
    const qrIds = new Set(
      document.collectionItems
        .filter((item) => item.collectionId === collection.id)
        .map((item) => item.qrId),
    )
    collectionViews.set(
      collection.id,
      Object.freeze({ ...collection, qrs: Object.freeze(qrs.filter((qr) => qrIds.has(qr.id))) }),
    )
  })
  const assignedQrIds = new Set(document.collectionItems.map((item) => item.qrId))
  const counts = Object.freeze({
    qrs: document.qrs.length,
    collections: document.collections.length,
    assignments: document.collectionItems.length,
    uncategorized: document.qrs.filter((qr) => !assignedQrIds.has(qr.id)).length,
  }) satisfies VaultCounts

  function resolveScope(scope: QrScope): QrScope {
    if (scope === 'all' || scope === 'uncategorized') return scope
    return collectionById.has(scope) ? scope : 'all'
  }

  function listQrs(input: ListQrsInput = {}): readonly QrView[] {
    const scope = resolveScope(input.scope ?? 'all')
    let result = qrs as readonly QrView[]
    if (scope === 'uncategorized') result = result.filter((qr) => !assignedQrIds.has(qr.id))
    else if (scope !== 'all') {
      const ids = new Set(
        document.collectionItems
          .filter((item) => item.collectionId === scope)
          .map((item) => item.qrId),
      )
      result = result.filter((qr) => ids.has(qr.id))
    }
    result = searchQrs(result, input.search ?? '')
    if ((input.order ?? 'recent') === 'recent') result = sortQrsByRecent(result)
    return Object.freeze([...result])
  }

  return Object.freeze({
    counts,
    collections,
    resolveScope,
    listQrs,
    getQr: (id: string) => qrById.get(id),
    getCollection: (id: string): CollectionView | undefined => collectionViews.get(id),
  })
}

function searchQrs(qrs: readonly QrView[], search: string): readonly QrView[] {
  const normalized = search.trim().toLowerCase()
  if (!normalized) return qrs
  return qrs.filter((qr) => {
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

function sortQrsByRecent(qrs: readonly QrView[]): QrView[] {
  return qrs
    .map((qr, index) => ({ qr, index }))
    .toSorted((a, b) => {
      const updatedDiff = timestamp(b.qr.updatedAt) - timestamp(a.qr.updatedAt)
      if (updatedDiff !== 0) return updatedDiff
      const createdDiff = timestamp(b.qr.createdAt) - timestamp(a.qr.createdAt)
      return createdDiff || a.index - b.index
    })
    .map(({ qr }) => qr)
}

function timestamp(value: string) {
  const parsed = Date.parse(value)
  return Number.isNaN(parsed) ? 0 : parsed
}

function firstById<T extends { id: string }>(items: readonly T[]) {
  const map = new Map<string, T>()
  items.forEach((item) => {
    if (!map.has(item.id)) map.set(item.id, item)
  })
  return map
}

function cloneAndFreeze<T>(value: T): T {
  const clone = structuredClone(value)
  deepFreeze(clone)
  return clone
}

function deepFreeze(value: unknown): void {
  if (value === null || typeof value !== 'object' || Object.isFrozen(value)) return
  Object.values(value).forEach((item) => deepFreeze(item))
  Object.freeze(value)
}
