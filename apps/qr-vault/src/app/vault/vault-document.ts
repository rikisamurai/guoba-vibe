import type { QueryRow } from '@/lib/url'

export type QrDocument = {
  id: string
  title?: string
  description?: string
  url: string
  queryParams?: QueryRow[]
  createdAt: string
  updatedAt: string
}

export type CollectionDocument = {
  id: string
  title: string
  description?: string
  createdAt: string
  updatedAt: string
}

export type CollectionItemDocument = {
  collectionId: string
  qrId: string
}

export type VaultDocument = {
  version: 1
  qrs: QrDocument[]
  collections: CollectionDocument[]
  collectionItems: CollectionItemDocument[]
}

export function createEmptyDocument(): VaultDocument {
  return { version: 1, qrs: [], collections: [], collectionItems: [] }
}

export function buildDemoDocument(now: string, nextId: () => string): VaultDocument {
  const collections = [
    { id: nextId(), title: 'Search & Reference', description: 'Everyday lookups' },
    { id: nextId(), title: 'Dev Tools', description: 'Build / ship workflows' },
  ]
  const qrs = [
    { id: nextId(), title: 'YouTube', url: 'https://www.youtube.com', collection: 0 },
    { id: nextId(), title: 'MDN', url: 'https://developer.mozilla.org', collection: 0 },
    { id: nextId(), title: 'GitHub', url: 'https://github.com', collection: 1 },
    { id: nextId(), title: 'Vercel', url: 'https://vercel.com', collection: 1 },
    { id: nextId(), title: 'Linear', url: 'https://linear.app', collection: 1 },
  ]

  return {
    version: 1,
    qrs: qrs.map(({ id, title, url }) => ({ id, title, url, createdAt: now, updatedAt: now })),
    collections: collections.map(({ id, title, description }) => ({
      id,
      title,
      description,
      createdAt: now,
      updatedAt: now,
    })),
    collectionItems: qrs.map(({ id, collection }) => ({
      collectionId: collections[collection].id,
      qrId: id,
    })),
  }
}

export function parseVaultDocument(raw: string): VaultDocument | null {
  try {
    const parsed = JSON.parse(raw) as unknown
    return isVaultDocument(parsed) ? parsed : null
  } catch {
    return null
  }
}

export function serializeVaultDocument(document: VaultDocument): string {
  return JSON.stringify(document, null, 2)
}

function isVaultDocument(value: unknown): value is VaultDocument {
  if (!value || typeof value !== 'object') return false
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- fields are checked below
  const candidate = value as VaultDocument
  return (
    candidate.version === 1 &&
    Array.isArray(candidate.qrs) &&
    Array.isArray(candidate.collections) &&
    Array.isArray(candidate.collectionItems) &&
    candidate.qrs.every(
      (qr) =>
        typeof qr.id === 'string' &&
        typeof qr.url === 'string' &&
        (qr.queryParams === undefined || isQueryRows(qr.queryParams)),
    ) &&
    candidate.collections.every(
      (collection) => typeof collection.id === 'string' && typeof collection.title === 'string',
    ) &&
    candidate.collectionItems.every(
      (item) => typeof item.collectionId === 'string' && typeof item.qrId === 'string',
    )
  )
}

function isQueryRows(value: unknown): value is QueryRow[] {
  return (
    Array.isArray(value) &&
    value.every(
      (row) =>
        typeof row.id === 'string' &&
        typeof row.key === 'string' &&
        typeof row.value === 'string' &&
        typeof row.enabled === 'boolean',
    )
  )
}
