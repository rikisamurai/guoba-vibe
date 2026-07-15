import type { QueryRow } from '@/lib/url'

export type QrView = Readonly<{
  id: string
  title?: string
  description?: string
  url: string
  queryParams?: readonly Readonly<QueryRow>[]
  createdAt: string
  updatedAt: string
  collectionIds: readonly string[]
  collectionTitles: readonly string[]
}>

export type CollectionSummary = Readonly<{
  id: string
  title: string
  description?: string
  createdAt: string
  updatedAt: string
  qrCount: number
}>

export type CollectionView = CollectionSummary &
  Readonly<{
    qrs: readonly QrView[]
  }>

export type VaultCounts = Readonly<{
  qrs: number
  collections: number
  assignments: number
  uncategorized: number
}>

// (string & {}) keeps literal autocomplete while accepting Collection ids.
export type QrScope = 'all' | 'uncategorized' | (string & {})

export type ListQrsInput = Readonly<{
  scope?: QrScope
  search?: string
  order?: 'stored' | 'recent'
}>

export interface VaultView {
  readonly counts: VaultCounts
  readonly collections: readonly CollectionSummary[]
  resolveScope(scope: QrScope): QrScope
  listQrs(input?: ListQrsInput): readonly QrView[]
  getQr(id: string): QrView | undefined
  getCollection(id: string): CollectionView | undefined
}

export type SaveQrInput = Readonly<{
  id?: string
  title?: string
  description?: string
  url: string
  queryParams?: readonly QueryRow[]
  collectionIds?: readonly string[]
}>

export type SharedQrInput = Readonly<{
  title?: string
  description?: string
  url: string
}>

export type SaveCollectionInput = Readonly<{
  id?: string
  title: string
  description?: string
}>

export type UndoResult = Readonly<{ kind: 'restored' | 'already-present' }>

export type DeleteReceipt<Entity extends 'qr' | 'collection'> =
  | Readonly<{ kind: 'not-found'; entity: Entity; id: string }>
  | Readonly<{
      kind: 'deleted'
      entity: Entity
      id: string
      undo(): UndoResult
    }>

declare const vaultImportBrand: unique symbol

export type VaultImport = Readonly<{
  kind: 'valid'
  counts: VaultCounts
  [vaultImportBrand]: true
}>

export type InvalidImport = Readonly<{ kind: 'invalid' }>

export interface VaultHandle {
  readonly view: VaultView
  readonly qr: {
    save(input: SaveQrInput): Readonly<{ id: string; created: boolean }>
    saveShared(
      input: SharedQrInput,
    ): Readonly<{ kind: 'existing'; id: string }> | Readonly<{ kind: 'created'; id: string }>
    delete(id: string): DeleteReceipt<'qr'>
  }
  readonly collection: {
    save(input: SaveCollectionInput): Readonly<{ id: string; created: boolean }>
    selectOrCreate(
      title: string,
    ): Readonly<{ kind: 'empty' }> | Readonly<{ kind: 'existing' | 'created'; id: string }>
    delete(id: string): DeleteReceipt<'collection'>
  }
  readonly transfer: {
    inspect(raw: string): InvalidImport | VaultImport
    apply(value: VaultImport, mode: 'merge' | 'replace'): VaultCounts
    exportJSON(): string
  }
}
