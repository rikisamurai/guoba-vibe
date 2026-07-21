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

export function serializeVaultDocument(document: VaultDocument): string {
  return JSON.stringify(document, null, 2)
}
