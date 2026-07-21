import { createDeleteReceipt } from '@/app/vault/vault-delete-receipt'
import { serializeVaultDocument, type VaultDocument } from '@/app/vault/vault-document'
import { decodeVaultDocument } from '@/app/vault/vault-document-decoder'
import {
  deleteCollectionDocument,
  deleteQrDocument,
  mergeVaultDocuments,
  restoreCollectionDocument,
  restoreQrDocument,
  saveCollectionDocument,
  saveQrDocument,
} from '@/app/vault/vault-document-operations'
import { VaultStorageError, type VaultStorageAdapter } from '@/app/vault/vault-storage'
import type { InvalidImport, VaultHandle, VaultImport, VaultView } from '@/app/vault/vault-types'
import { buildVaultView } from '@/app/vault/vault-view'

type Listener = () => void

export interface VaultStore extends Omit<VaultHandle, 'view'> {
  readonly getSnapshot: () => VaultView
  readonly subscribe: (listener: Listener) => () => void
}

export type CreateVaultStoreInput = Readonly<{
  storage: VaultStorageAdapter
  now: () => string
  nextId: () => string
}>

const importDocuments = new WeakMap<object, VaultDocument>()
export function createVaultStore(
  input: CreateVaultStoreInput,
  initialDocument: VaultDocument,
): VaultStore {
  let document = initialDocument
  let serialized = serializeVaultDocument(document)
  let view = buildVaultView(document)
  const listeners = new Set<Listener>()

  function write(next: VaultDocument): boolean {
    const nextSerialized = serializeVaultDocument(next)
    if (nextSerialized === serialized) return false
    const nextView = buildVaultView(next)
    try {
      input.storage.write(nextSerialized)
    } catch (cause) {
      throw new VaultStorageError('write', cause)
    }
    document = next
    serialized = nextSerialized
    view = nextView
    listeners.forEach((listener) => listener())
    return true
  }

  const qr: VaultStore['qr'] = Object.freeze({
    save(saveInput) {
      const result = saveQrDocument(document, saveInput, input.now(), input.nextId)
      write(result.document)
      return Object.freeze({ id: result.id, created: result.created })
    },
    saveShared(sharedInput) {
      const existing = document.qrs.find((qrItem) => qrItem.url === sharedInput.url)
      if (existing) return Object.freeze({ kind: 'existing' as const, id: existing.id })
      const result = saveQrDocument(document, sharedInput, input.now(), input.nextId)
      write(result.document)
      return Object.freeze({ kind: 'created' as const, id: result.id })
    },
    delete(id) {
      const index = document.qrs.findIndex((qrItem) => qrItem.id === id)
      const deleted = document.qrs[index]
      if (!deleted) return Object.freeze({ kind: 'not-found', entity: 'qr', id })
      const items = document.collectionItems.filter((item) => item.qrId === id)
      write(deleteQrDocument(document, id))
      return createDeleteReceipt('qr', id, () => {
        if (document.qrs.some((qrItem) => qrItem.id === id)) return false
        return write(restoreQrDocument(document, deleted, items, index))
      })
    },
  })

  const collection: VaultStore['collection'] = Object.freeze({
    save(saveInput) {
      const result = saveCollectionDocument(document, saveInput, input.now(), input.nextId)
      write(result.document)
      return Object.freeze({ id: result.id, created: result.created })
    },
    selectOrCreate(rawTitle) {
      const title = rawTitle.trim()
      if (!title) return Object.freeze({ kind: 'empty' as const })
      const existing = document.collections.find((item) => item.title === title)
      if (existing) return Object.freeze({ kind: 'existing' as const, id: existing.id })
      const result = saveCollectionDocument(
        document,
        { id: input.nextId(), title },
        input.now(),
        input.nextId,
      )
      write(result.document)
      return Object.freeze({ kind: 'created' as const, id: result.id })
    },
    delete(id) {
      const deleted = document.collections.find((item) => item.id === id)
      if (!deleted) return Object.freeze({ kind: 'not-found', entity: 'collection', id })
      const items = document.collectionItems.filter((item) => item.collectionId === id)
      write(deleteCollectionDocument(document, id))
      return createDeleteReceipt('collection', id, () => {
        if (document.collections.some((item) => item.id === id)) return false
        return write(restoreCollectionDocument(document, deleted, items))
      })
    },
  })

  const transfer: VaultStore['transfer'] = Object.freeze({
    inspect(raw) {
      const decoded = decodeVaultDocument(raw)
      if (decoded.kind === 'invalid') return decoded satisfies InvalidImport
      const candidateDocument = decoded.document
      const candidate = Object.freeze({
        kind: 'valid' as const,
        counts: buildVaultView(candidateDocument).counts,
      })
      importDocuments.set(candidate, candidateDocument)
      // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- private brand seals import data
      return candidate as VaultImport
    },
    apply(candidate, mode) {
      const incoming = importDocuments.get(candidate)
      if (!incoming) throw new Error('Vault import candidate was not created by inspect')
      write(mode === 'merge' ? mergeVaultDocuments(document, incoming) : incoming)
      return view.counts
    },
    exportJSON: () => serialized,
  })

  return Object.freeze({
    qr,
    collection,
    transfer,
    getSnapshot: () => view,
    subscribe(listener: Listener) {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
  })
}
