import { describe, expect, it, vi } from 'vitest'

import { openVaultStore } from '@/app/vault/vault-open'
import { VaultStorageError, type VaultStorageAdapter } from '@/app/vault/vault-storage'

const EMPTY_DOCUMENT = JSON.stringify({
  version: 1,
  qrs: [],
  collections: [],
  collectionItems: [],
})

class MemoryVaultStorage implements VaultStorageAdapter {
  raw: string | null
  writes: string[] = []
  failRead = false
  failWrite = false

  constructor(raw: string | null = EMPTY_DOCUMENT) {
    this.raw = raw
  }

  read() {
    if (this.failRead) throw new Error('read failed')
    return this.raw
  }

  write(serialized: string) {
    if (this.failWrite) throw new Error('write failed')
    this.raw = serialized
    this.writes.push(serialized)
  }
}

function openWith(storage: MemoryVaultStorage, options: { ids?: string[]; times?: string[] } = {}) {
  const ids = options.ids ?? ['generated']
  const times = options.times ?? ['2026-01-10T00:00:00.000Z']
  let idIndex = 0
  let timeIndex = 0
  return openVaultStore({
    storage,
    nextId: () => ids[idIndex++] ?? `generated-${idIndex}`,
    now: () => times[timeIndex++] ?? times.at(-1)!,
  })
}

function storeWith(
  storage: MemoryVaultStorage,
  options: { ids?: string[]; times?: string[] } = {},
) {
  const opened = openWith(storage, options)
  if (opened.kind !== 'ready') throw new Error('expected ready Vault')
  return opened.store
}

function serializedDocument(input: {
  qrs?: unknown[]
  collections?: unknown[]
  collectionItems?: unknown[]
  extra?: Record<string, unknown>
}) {
  return JSON.stringify({
    version: 1,
    qrs: input.qrs ?? [],
    collections: input.collections ?? [],
    collectionItems: input.collectionItems ?? [],
    ...input.extra,
  })
}

const qr = (id: string, updatedAt = '2026-01-01T00:00:00.000Z') => ({
  id,
  url: `xhsdiscover://rn/${id}`,
  createdAt: updatedAt,
  updatedAt,
})

const collection = (id: string, title = id) => ({
  id,
  title,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
})

describe('Vault Store bootstrap and persistence', () => {
  it('seeds a missing Vault once and restores it in a new Store', () => {
    const storage = new MemoryVaultStorage(null)
    const ids = ['c1', 'c2', 'q1', 'q2', 'q3', 'q4', 'q5']
    const first = storeWith(storage, { ids, times: ['2026-01-01T00:00:00.000Z'] })

    expect(first.getSnapshot().counts).toEqual({
      qrs: 5,
      collections: 2,
      assignments: 5,
      uncategorized: 0,
    })
    expect(storage.writes).toHaveLength(1)
    expect(
      JSON.parse(storage.writes[0]).collections.map((item: { id: string }) => item.id),
    ).toEqual(['c1', 'c2'])

    const restored = storeWith(storage, { ids: ['unused'] })
    expect(restored.getSnapshot().counts).toEqual(first.getSnapshot().counts)
    expect(storage.writes).toHaveLength(1)
  })

  it('loads valid extension fields and unresolved repeated relations without normalizing them', () => {
    const raw = serializedDocument({
      qrs: [{ ...qr('q'), extra: true }],
      collections: [{ ...collection('c', 'C'), extra: true }],
      collectionItems: [
        { collectionId: 'missing', qrId: 'q' },
        { collectionId: 'missing', qrId: 'q' },
      ],
      extra: { extension: 'kept' },
    })
    const storage = new MemoryVaultStorage(raw)
    const store = storeWith(storage)

    expect(store.getSnapshot().counts).toEqual({
      qrs: 1,
      collections: 1,
      assignments: 2,
      uncategorized: 0,
    })
    expect(JSON.parse(store.transfer.exportJSON())).toMatchObject({ extension: 'kept' })
    expect(storage.writes).toHaveLength(0)
  })

  it('opens unreadable persisted data in recovery without exposing a writable Store', () => {
    const raw = '{bad json'
    const storage = new MemoryVaultStorage(raw)
    const opened = openWith(storage)

    expect(opened).toMatchObject({
      kind: 'recovery',
      raw,
      issues: [{ path: '$', code: 'invalid-json', received: 'invalid-json' }],
      truncated: false,
    })
    expect('store' in opened).toBe(false)
    expect(storage.raw).toBe(raw)
    expect(storage.writes).toHaveLength(0)
  })

  it('reports every declared field mismatch without exposing invalid data to the view', () => {
    const raw = serializedDocument({
      qrs: [
        {
          id: 'q',
          url: 'raw',
          description: { flag: false },
          createdAt: { nested: true },
        },
      ],
      collections: [{ ...collection('c'), updatedAt: false }],
      collectionItems: [{ collectionId: 'c', qrId: 1 }],
    })
    const storage = new MemoryVaultStorage(raw)
    const opened = openWith(storage)

    expect(opened).toMatchObject({
      kind: 'recovery',
      issues: [
        { path: '$.qrs[0].description', code: 'expected-string', received: 'object' },
        { path: '$.qrs[0].createdAt', code: 'expected-string', received: 'object' },
        { path: '$.qrs[0].updatedAt', code: 'expected-string', received: 'missing' },
        { path: '$.collections[0].updatedAt', code: 'expected-string', received: 'boolean' },
        { path: '$.collectionItems[0].qrId', code: 'expected-string', received: 'number' },
      ],
      truncated: false,
    })
    expect('store' in opened).toBe(false)
    expect(storage.raw).toBe(raw)
    expect(storage.writes).toHaveLength(0)
  })

  it('wraps bootstrap read and seed write failures', () => {
    const readFailure = new MemoryVaultStorage()
    readFailure.failRead = true
    expect(() => storeWith(readFailure)).toThrow(VaultStorageError)

    const writeFailure = new MemoryVaultStorage(null)
    writeFailure.failWrite = true
    expect(() => storeWith(writeFailure)).toThrow(VaultStorageError)
  })

  it('keeps recovery active for invalid repairs and replaces data only after a valid repair', () => {
    const original = '{bad json'
    const storage = new MemoryVaultStorage(original)
    const opened = openWith(storage)
    if (opened.kind !== 'recovery') throw new Error('expected recovery')

    const rejected = opened.repair(
      serializedDocument({ qrs: [{ ...qr('unsafe'), description: { unsafe: true } }] }),
    )
    expect(rejected).toMatchObject({
      kind: 'invalid',
      issues: [{ path: '$.qrs[0].description', code: 'expected-string' }],
    })
    expect(storage.raw).toBe(original)
    expect(storage.writes).toHaveLength(0)

    const repairedRaw = serializedDocument({
      qrs: [{ ...qr('recovered'), extension: { kept: true } }],
      extra: { extension: { source: 'manual-repair' } },
    })
    const repaired = opened.repair(repairedRaw)
    if (repaired.kind !== 'ready') throw new Error('expected ready Vault')

    expect(repaired.store.getSnapshot().getQr('recovered')).toBeDefined()
    expect(JSON.parse(repaired.store.transfer.exportJSON())).toMatchObject({
      extension: { source: 'manual-repair' },
      qrs: [{ extension: { kept: true } }],
    })
    expect(storage.writes).toHaveLength(1)
    expect(JSON.parse(storage.raw!)).toEqual(JSON.parse(repairedRaw))
  })

  it('keeps the original recovery data when repair persistence fails', () => {
    const original = '{bad json'
    const storage = new MemoryVaultStorage(original)
    const opened = openWith(storage)
    if (opened.kind !== 'recovery') throw new Error('expected recovery')
    storage.failWrite = true

    expect(() => opened.repair(serializedDocument({ qrs: [qr('recovered')] }))).toThrow(
      VaultStorageError,
    )
    expect(storage.raw).toBe(original)
    expect(storage.writes).toHaveLength(0)
  })

  it('resets recovery to a persisted empty document only through the explicit reset command', () => {
    const storage = new MemoryVaultStorage('{bad json')
    const opened = openWith(storage)
    if (opened.kind !== 'recovery') throw new Error('expected recovery')

    const reset = opened.reset()

    expect(reset.store.getSnapshot().counts).toEqual({
      qrs: 0,
      collections: 0,
      assignments: 0,
      uncategorized: 0,
    })
    expect(storage.writes).toHaveLength(1)
    expect(JSON.parse(storage.raw!)).toEqual(JSON.parse(EMPTY_DOCUMENT))
  })

  it('keeps recovery retryable when reset persistence fails', () => {
    const original = '{bad json'
    const storage = new MemoryVaultStorage(original)
    const opened = openWith(storage)
    if (opened.kind !== 'recovery') throw new Error('expected recovery')
    storage.failWrite = true

    expect(() => opened.reset()).toThrow(VaultStorageError)
    expect(storage.raw).toBe(original)
    expect(storage.writes).toHaveLength(0)

    storage.failWrite = false
    const reset = opened.reset()
    expect(reset.store.getSnapshot().counts.qrs).toBe(0)
    expect(storage.writes).toHaveLength(1)
    expect(JSON.parse(storage.raw!)).toEqual(JSON.parse(EMPTY_DOCUMENT))
  })

  it('caps reported validation issues and marks additional issues as truncated', () => {
    const raw = serializedDocument({ qrs: Array.from({ length: 6 }, () => ({})) })
    const opened = openWith(new MemoryVaultStorage(raw))

    expect(opened.kind).toBe('recovery')
    if (opened.kind !== 'recovery') return
    expect(opened.issues).toHaveLength(20)
    expect(opened.issues.at(-1)?.path).toBe('$.qrs[4].updatedAt')
    expect(opened.truncated).toBe(true)
  })
})

describe('Vault QR and Collection commands', () => {
  it('preserves entity, query-row, and relation extensions while editing', () => {
    const storage = new MemoryVaultStorage(
      serializedDocument({
        qrs: [
          {
            ...qr('existing'),
            extension: { entity: true },
            queryParams: [
              { id: 'row', key: 'old-1', value: '1', enabled: true, extension: 'first-row' },
              { id: 'row', key: 'old-2', value: '2', enabled: true, extension: 'second-row' },
            ],
          },
        ],
        collections: [{ ...collection('c'), extension: { collection: true } }],
        collectionItems: [
          { collectionId: 'c', qrId: 'existing', extension: 'first' },
          { collectionId: 'c', qrId: 'existing', extension: 'second' },
        ],
      }),
    )
    const store = storeWith(storage, { times: ['2026-02-01T00:00:00.000Z'] })

    store.qr.save({
      id: 'existing',
      url: 'updated',
      queryParams: [
        { id: 'row', key: 'updated-1', value: '3', enabled: false },
        { id: 'row', key: 'updated-2', value: '4', enabled: false },
      ],
      collectionIds: ['c', 'c'],
    })
    store.collection.save({ id: 'c', title: 'Updated' })

    expect(JSON.parse(store.transfer.exportJSON())).toMatchObject({
      qrs: [
        {
          extension: { entity: true },
          queryParams: [
            { key: 'updated-1', extension: 'first-row' },
            { key: 'updated-2', extension: 'second-row' },
          ],
        },
      ],
      collections: [{ title: 'Updated', extension: { collection: true } }],
      collectionItems: [{ extension: 'first' }, { extension: 'second' }],
    })
  })

  it('creates, updates, and saves a QR as new while preserving assignment rules', () => {
    const storage = new MemoryVaultStorage(
      serializedDocument({
        qrs: [qr('existing')],
        collections: [collection('a'), collection('b')],
        collectionItems: [
          { collectionId: 'a', qrId: 'existing' },
          { collectionId: 'a', qrId: 'existing' },
          { collectionId: 'b', qrId: 'other' },
        ],
      }),
    )
    const store = storeWith(storage, {
      ids: ['new-id'],
      times: ['2026-02-01T00:00:00.000Z', '2026-02-02T00:00:00.000Z'],
    })

    const updated = store.qr.save({
      id: 'existing',
      title: '  Updated  ',
      description: '   ',
      url: '  raw-url  ',
      queryParams: [],
    })
    expect(updated).toEqual({ id: 'existing', created: false })
    expect(store.getSnapshot().getQr('existing')).toMatchObject({
      title: 'Updated',
      description: undefined,
      url: '  raw-url  ',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-02-01T00:00:00.000Z',
      collectionIds: ['a', 'a'],
    })

    const created = store.qr.save({
      title: 'New',
      url: 'xhsdiscover://rn/new',
      collectionIds: ['a', 'b'],
      queryParams: [{ id: 'off', key: 'host', value: '1', enabled: false }],
    })
    expect(created).toEqual({ id: 'new-id', created: true })
    expect(store.getSnapshot().getQr('new-id')).toMatchObject({
      collectionIds: ['a', 'b'],
      queryParams: [{ id: 'off', key: 'host', value: '1', enabled: false }],
    })
    store.qr.save({
      id: 'new-id',
      title: 'New',
      url: 'xhsdiscover://rn/new',
      collectionIds: [],
    })
    expect(store.getSnapshot().getQr('new-id')?.collectionIds).toEqual([])
    expect(storage.writes).toHaveLength(3)
    expect(storeWith(storage).getSnapshot().getQr('new-id')).toBeDefined()
  })

  it('reuses the first exact shared URL without writing and creates non-exact URLs', () => {
    const storage = new MemoryVaultStorage(
      serializedDocument({
        qrs: [
          { ...qr('first'), url: 'Exact' },
          { ...qr('second'), url: 'Exact' },
        ],
      }),
    )
    const store = storeWith(storage, { ids: ['created'] })

    expect(store.qr.saveShared({ url: 'Exact', title: 'Ignored' })).toEqual({
      kind: 'existing',
      id: 'first',
    })
    expect(storage.writes).toHaveLength(0)
    expect(store.qr.saveShared({ url: 'exact', title: '  Shared  ' })).toEqual({
      kind: 'created',
      id: 'created',
    })
    expect(store.getSnapshot().getQr('created')?.title).toBe('Shared')
  })

  it('preserves generated-id collision behavior for QR and inline Collection creation', () => {
    const storage = new MemoryVaultStorage(
      serializedDocument({
        qrs: [{ ...qr('collision'), url: 'old' }],
        collections: [collection('collision', 'Old')],
      }),
    )
    const store = storeWith(storage, { ids: ['collision', 'collision'] })

    expect(store.qr.saveShared({ url: 'new' })).toEqual({ kind: 'created', id: 'collision' })
    expect(store.getSnapshot().counts.qrs).toBe(1)
    expect(store.getSnapshot().getQr('collision')?.url).toBe('new')
    expect(store.collection.selectOrCreate('New')).toEqual({
      kind: 'created',
      id: 'collision',
    })
    expect(store.getSnapshot().counts.collections).toBe(1)
    expect(store.getSnapshot().getCollection('collision')?.title).toBe('New')
  })

  it('saves Collections and selects or creates titles exactly and case-sensitively', () => {
    const storage = new MemoryVaultStorage(
      serializedDocument({ collections: [collection('dev', 'Dev Tools')] }),
    )
    const store = storeWith(storage, {
      ids: ['lower'],
      times: ['2026-02-01T00:00:00.000Z'],
    })

    expect(store.collection.selectOrCreate('  Dev Tools  ')).toEqual({
      kind: 'existing',
      id: 'dev',
    })
    expect(store.collection.selectOrCreate('dev tools')).toEqual({
      kind: 'created',
      id: 'lower',
    })
    expect(store.collection.selectOrCreate('   ')).toEqual({ kind: 'empty' })
    expect(store.collection.save({ id: 'dev', title: ' Updated ', description: ' ' })).toEqual({
      id: 'dev',
      created: false,
    })
    expect(store.getSnapshot().getCollection('dev')).toMatchObject({
      title: 'Updated',
      description: undefined,
      createdAt: '2026-01-01T00:00:00.000Z',
    })
  })
})

describe('Vault delete receipts', () => {
  it('restores a QR at its prior position after intervening writes and is repeat-safe', () => {
    const storage = new MemoryVaultStorage(
      serializedDocument({
        qrs: [qr('a'), qr('b'), qr('c')],
        collections: [collection('folder')],
        collectionItems: [
          { collectionId: 'folder', qrId: 'b' },
          { collectionId: 'folder', qrId: 'b' },
        ],
      }),
    )
    const store = storeWith(storage, { ids: ['d'] })
    const receipt = store.qr.delete('b')
    expect(receipt.kind).toBe('deleted')
    store.qr.save({ url: 'xhsdiscover://rn/d' })
    if (receipt.kind !== 'deleted') throw new Error('expected deleted receipt')

    expect(receipt.undo()).toEqual({ kind: 'restored' })
    expect(
      store
        .getSnapshot()
        .listQrs({ order: 'stored' })
        .map((item) => item.id),
    ).toEqual(['a', 'b', 'c', 'd'])
    expect(store.getSnapshot().getQr('b')?.collectionIds).toEqual(['folder', 'folder'])
    store.qr.delete('b')
    const writes = storage.writes.length
    expect(receipt.undo()).toEqual({ kind: 'already-present' })
    expect(storage.writes).toHaveLength(writes)
    expect(store.getSnapshot().getQr('b')).toBeUndefined()
  })

  it('appends a restored Collection and leaves deleted QRs deleted', () => {
    const storage = new MemoryVaultStorage(
      serializedDocument({
        qrs: [qr('q')],
        collections: [collection('a'), collection('b')],
        collectionItems: [{ collectionId: 'a', qrId: 'q' }],
      }),
    )
    const store = storeWith(storage, { ids: ['c'] })
    const receipt = store.collection.delete('a')
    store.collection.save({ title: 'C' })
    store.qr.delete('q')
    if (receipt.kind !== 'deleted') throw new Error('expected deleted receipt')

    expect(receipt.undo()).toEqual({ kind: 'restored' })
    expect(store.getSnapshot().collections.map((item) => item.id)).toEqual(['b', 'c', 'a'])
    expect(store.getSnapshot().counts.assignments).toBe(1)
    expect(store.getSnapshot().getQr('q')).toBeUndefined()
    store.collection.delete('a')
    const writes = storage.writes.length
    expect(receipt.undo()).toEqual({ kind: 'already-present' })
    expect(storage.writes).toHaveLength(writes)
    expect(store.getSnapshot().getCollection('a')).toBeUndefined()
  })
})

describe('Vault views and transfers', () => {
  it('orders an older-created QR first when it was updated more recently', () => {
    const storage = new MemoryVaultStorage(
      serializedDocument({
        qrs: [
          {
            ...qr('newer'),
            createdAt: '2026-01-02T00:00:00.000Z',
            updatedAt: '2026-01-02T00:00:00.000Z',
          },
          {
            ...qr('older'),
            createdAt: '2026-01-01T00:00:00.000Z',
            updatedAt: '2026-01-03T00:00:00.000Z',
          },
        ],
      }),
    )
    const store = storeWith(storage)

    expect(
      store
        .getSnapshot()
        .listQrs()
        .map((item) => item.id),
    ).toEqual(['older', 'newer'])
  })

  it('keeps persisted order when recent timestamps tie', () => {
    const storage = new MemoryVaultStorage(serializedDocument({ qrs: [qr('a'), qr('b'), qr('c')] }))
    const store = storeWith(storage)

    expect(
      store
        .getSnapshot()
        .listQrs()
        .map((item) => item.id),
    ).toEqual(['a', 'b', 'c'])
    expect(
      JSON.parse(store.transfer.exportJSON()).qrs.map((item: { id: string }) => item.id),
    ).toEqual(['a', 'b', 'c'])
  })

  it('provides counts, visible Collection data, filter fallback, search, and recent order', () => {
    const storage = new MemoryVaultStorage(
      serializedDocument({
        qrs: [
          { ...qr('old', '2026-01-01T00:00:00.000Z'), title: 'Reference' },
          { ...qr('new', '2026-01-03T00:00:00.000Z'), url: 'xhs://page?mode=RN' },
          { ...qr('bad', 'invalid'), description: 'Find me' },
        ],
        collections: [collection('folder', 'Folder')],
        collectionItems: [
          { collectionId: 'folder', qrId: 'old' },
          { collectionId: 'folder', qrId: 'old' },
          { collectionId: 'missing', qrId: 'new' },
        ],
      }),
    )
    const view = storeWith(storage).getSnapshot()

    expect(view.counts).toEqual({ qrs: 3, collections: 1, assignments: 3, uncategorized: 1 })
    expect(view.collections[0].qrCount).toBe(2)
    expect(view.getCollection('folder')?.qrs.map((item) => item.id)).toEqual(['old'])
    expect(view.getQr('old')).toMatchObject({
      collectionIds: ['folder', 'folder'],
      collectionTitles: ['Folder', 'Folder'],
    })
    expect(view.resolveScope('missing')).toBe('all')
    expect(view.listQrs({ scope: 'missing' }).map((item) => item.id)).toEqual(['new', 'old', 'bad'])
    expect(view.listQrs({ search: 'mode' }).map((item) => item.id)).toEqual(['new'])
    expect(view.listQrs({ search: 'find me' }).map((item) => item.id)).toEqual(['bad'])
    expect(view.listQrs({ scope: 'uncategorized' }).map((item) => item.id)).toEqual(['bad'])
  })

  it('inspects invalid imports and applies reusable incoming-wins merge candidates', () => {
    const storage = new MemoryVaultStorage(
      serializedDocument({
        qrs: [{ ...qr('same'), title: 'Local' }, qr('local')],
        collections: [collection('same-c', 'Local collection'), collection('local-c')],
        collectionItems: [{ collectionId: 'same-c', qrId: 'local' }],
      }),
    )
    const store = storeWith(storage, { ids: ['intervening'] })
    expect(store.transfer.inspect('{')).toMatchObject({
      kind: 'invalid',
      issues: [{ path: '$', code: 'invalid-json', received: 'invalid-json' }],
      truncated: false,
    })
    expect(store.transfer.inspect(JSON.stringify({ version: 1, qrs: [] }))).toMatchObject({
      kind: 'invalid',
      issues: [
        { path: '$.collections', code: 'expected-array', received: 'missing' },
        { path: '$.collectionItems', code: 'expected-array', received: 'missing' },
      ],
    })

    const before = store.getSnapshot()
    const beforeRaw = storage.raw
    expect(
      store.transfer.inspect(
        serializedDocument({ qrs: [{ ...qr('unsafe'), description: { unsafe: true } }] }),
      ),
    ).toMatchObject({
      kind: 'invalid',
      issues: [{ path: '$.qrs[0].description', code: 'expected-string', received: 'object' }],
    })
    expect(store.getSnapshot()).toBe(before)
    expect(storage.raw).toBe(beforeRaw)
    expect(storage.writes).toHaveLength(0)

    const candidate = store.transfer.inspect(
      serializedDocument({
        qrs: [{ ...qr('same'), title: 'Incoming' }, qr('incoming')],
        collections: [collection('same-c', 'Incoming collection'), collection('incoming-c')],
        collectionItems: [
          { collectionId: 'same-c', qrId: 'local' },
          { collectionId: 'incoming-c', qrId: 'incoming' },
        ],
      }),
    )
    if (candidate.kind !== 'valid') throw new Error('expected valid candidate')
    expect(candidate.counts).toMatchObject({ qrs: 2, collections: 2, assignments: 2 })

    store.qr.save({ url: 'xhsdiscover://rn/intervening' })
    expect(store.transfer.apply(candidate, 'merge')).toMatchObject({
      qrs: 4,
      collections: 3,
      assignments: 2,
    })
    expect(store.getSnapshot().getQr('same')?.title).toBe('Incoming')
    expect(store.getSnapshot().getCollection('same-c')?.title).toBe('Incoming collection')
    expect(store.getSnapshot().getQr('local')?.collectionIds).toEqual(['same-c'])
    expect(store.transfer.apply(candidate, 'replace')).toMatchObject({ qrs: 2, collections: 2 })
    expect(store.getSnapshot().getQr('local')).toBeUndefined()
    expect(store.transfer.inspect(store.transfer.exportJSON()).kind).toBe('valid')
    expect(store.transfer.exportJSON()).toContain('\n  ')
  })

  it('round-trips a permissive export through a fresh Store without normalization', () => {
    const expected = {
      version: 1,
      qrs: [
        { ...qr('duplicate'), url: 'first', extension: { source: 'first' } },
        { ...qr('unique'), extension: ['kept', 'in-order'] },
        { ...qr('duplicate'), url: 'second', extension: { source: 'second' } },
      ],
      collections: [
        { ...collection('duplicate-collection', 'First'), extension: 1 },
        collection('unique-collection', 'Unique'),
        { ...collection('duplicate-collection', 'Second'), extension: 2 },
      ],
      collectionItems: [
        { collectionId: 'duplicate-collection', qrId: 'duplicate', extension: 'kept' },
        { collectionId: 'duplicate-collection', qrId: 'duplicate', extension: 'kept' },
        { collectionId: 'missing-collection', qrId: 'unique', orphan: 'collection' },
        { collectionId: 'unique-collection', qrId: 'missing-qr', orphan: 'qr' },
      ],
      extension: { version: 'custom-v1' },
    }
    const source = storeWith(new MemoryVaultStorage(JSON.stringify(expected)))
    const exported = source.transfer.exportJSON()
    expect(JSON.parse(exported)).toEqual(expected)
    const target = storeWith(new MemoryVaultStorage())
    const candidate = target.transfer.inspect(exported)
    if (candidate.kind !== 'valid') throw new Error('expected valid candidate')

    target.transfer.apply(candidate, 'replace')

    expect(JSON.parse(target.transfer.exportJSON())).toEqual(expected)
  })

  it('keeps local and incoming root extensions when merging, with incoming conflicts winning', () => {
    const store = storeWith(
      new MemoryVaultStorage(
        serializedDocument({ extra: { extra: { localOnly: true }, conflict: 'local' } }),
      ),
    )
    const candidate = store.transfer.inspect(
      serializedDocument({
        extra: { extraIncoming: { incomingOnly: true }, conflict: 'incoming' },
      }),
    )
    if (candidate.kind !== 'valid') throw new Error('expected valid candidate')

    store.transfer.apply(candidate, 'merge')

    expect(JSON.parse(store.transfer.exportJSON())).toMatchObject({
      extra: { localOnly: true },
      extraIncoming: { incomingOnly: true },
      conflict: 'incoming',
    })
  })
})

describe('Vault publication ordering and failures', () => {
  it('writes once before publishing each successful mutation', () => {
    const storage = new MemoryVaultStorage()
    const store = storeWith(storage, { ids: ['q'] })
    const observed: Array<{ writes: number; qrs: number }> = []
    store.subscribe(() => {
      observed.push({ writes: storage.writes.length, qrs: store.getSnapshot().counts.qrs })
    })

    store.qr.save({ url: 'xhsdiscover://rn/q' })
    expect(observed).toEqual([{ writes: 1, qrs: 1 }])
  })

  it('keeps the old snapshot and does not notify when storage fails', () => {
    const storage = new MemoryVaultStorage()
    const store = storeWith(storage, { ids: ['q'] })
    const before = store.getSnapshot()
    const listener = vi.fn()
    store.subscribe(listener)
    storage.failWrite = true

    expect(() => store.qr.save({ url: 'xhsdiscover://rn/q' })).toThrow(VaultStorageError)
    expect(store.getSnapshot()).toBe(before)
    expect(store.getSnapshot().counts.qrs).toBe(0)
    expect(listener).not.toHaveBeenCalled()
  })

  it('does not write or notify for semantic no-op commands', () => {
    const storage = new MemoryVaultStorage(
      serializedDocument({
        qrs: [{ ...qr('q'), url: 'exact' }],
        collections: [collection('c', 'C')],
      }),
    )
    const store = storeWith(storage)
    const listener = vi.fn()
    store.subscribe(listener)

    expect(store.qr.delete('missing').kind).toBe('not-found')
    expect(store.collection.delete('missing').kind).toBe('not-found')
    expect(store.qr.saveShared({ url: 'exact' }).kind).toBe('existing')
    expect(store.collection.selectOrCreate('C').kind).toBe('existing')
    expect(store.collection.selectOrCreate('   ').kind).toBe('empty')
    expect(storage.writes).toHaveLength(0)
    expect(listener).not.toHaveBeenCalled()
  })
})
