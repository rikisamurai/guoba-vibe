import type {
  CollectionDocument,
  CollectionItemDocument,
  QrDocument,
  VaultDocument,
} from '@/app/vault/vault-document'
import type { SaveCollectionInput, SaveQrInput } from '@/app/vault/vault-types'

export function saveQrDocument(
  document: VaultDocument,
  input: SaveQrInput,
  now: string,
  nextId: () => string,
) {
  const id = input.id ?? nextId()
  const existing = document.qrs.find((qr) => qr.id === id)
  const nextQr: QrDocument = {
    id,
    title: input.title?.trim() || undefined,
    description: input.description?.trim() || undefined,
    url: input.url,
    queryParams: input.queryParams?.length
      ? input.queryParams.map((row) => ({ ...row }))
      : undefined,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  }
  const qrs = existing
    ? document.qrs.map((qr) => (qr.id === id ? nextQr : qr))
    : [...document.qrs, nextQr]
  const collectionIds =
    input.collectionIds ??
    document.collectionItems.filter((item) => item.qrId === id).map((item) => item.collectionId)
  const collectionItems = [
    ...document.collectionItems.filter((item) => item.qrId !== id),
    ...collectionIds.map((collectionId) => ({ collectionId, qrId: id })),
  ]
  return { document: { ...document, qrs, collectionItems }, id, created: !existing }
}

export function saveCollectionDocument(
  document: VaultDocument,
  input: SaveCollectionInput,
  now: string,
  nextId: () => string,
) {
  const existing = input.id
    ? document.collections.find((collection) => collection.id === input.id)
    : undefined
  const id = existing?.id ?? input.id ?? nextId()
  const nextCollection: CollectionDocument = {
    id,
    title: input.title.trim(),
    description: input.description?.trim() || undefined,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  }
  const collections = existing
    ? document.collections.map((collection) => (collection.id === id ? nextCollection : collection))
    : [...document.collections, nextCollection]
  return { document: { ...document, collections }, id, created: !existing }
}

export function deleteQrDocument(document: VaultDocument, id: string): VaultDocument {
  return {
    ...document,
    qrs: document.qrs.filter((qr) => qr.id !== id),
    collectionItems: document.collectionItems.filter((item) => item.qrId !== id),
  }
}

export function restoreQrDocument(
  document: VaultDocument,
  qr: QrDocument,
  items: CollectionItemDocument[],
  index: number,
): VaultDocument {
  if (document.qrs.some((existing) => existing.id === qr.id)) return document
  const qrs = [...document.qrs]
  qrs.splice(Math.max(0, Math.min(index, qrs.length)), 0, qr)
  return { ...document, qrs, collectionItems: appendMissingItems(document.collectionItems, items) }
}

export function deleteCollectionDocument(document: VaultDocument, id: string): VaultDocument {
  return {
    ...document,
    collections: document.collections.filter((collection) => collection.id !== id),
    collectionItems: document.collectionItems.filter((item) => item.collectionId !== id),
  }
}

export function restoreCollectionDocument(
  document: VaultDocument,
  collection: CollectionDocument,
  items: CollectionItemDocument[],
): VaultDocument {
  if (document.collections.some((existing) => existing.id === collection.id)) return document
  return {
    ...document,
    collections: [...document.collections, collection],
    collectionItems: appendMissingItems(document.collectionItems, items),
  }
}

export function mergeVaultDocuments(local: VaultDocument, incoming: VaultDocument): VaultDocument {
  return {
    version: 1,
    qrs: mergeById(local.qrs, incoming.qrs),
    collections: mergeById(local.collections, incoming.collections),
    collectionItems: mergeItems(local.collectionItems, incoming.collectionItems),
  }
}

function appendMissingItems(current: CollectionItemDocument[], incoming: CollectionItemDocument[]) {
  const keys = new Set(current.map(itemKey))
  return [...current, ...incoming.filter((item) => !keys.has(itemKey(item)))]
}

function mergeById<T extends { id: string }>(local: T[], incoming: T[]): T[] {
  const map = new Map(local.map((item) => [item.id, item]))
  incoming.forEach((item) => map.set(item.id, item))
  return Array.from(map.values())
}

function mergeItems(local: CollectionItemDocument[], incoming: CollectionItemDocument[]) {
  const map = new Map<string, CollectionItemDocument>()
  ;[...local, ...incoming].forEach((item) => map.set(itemKey(item), item))
  return Array.from(map.values())
}

function itemKey(item: CollectionItemDocument) {
  return `${item.collectionId}:${item.qrId}`
}
