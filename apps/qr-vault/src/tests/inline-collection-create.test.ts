import { describe, expect, it, vi } from 'vitest'

import { openVaultStore } from '@/app/vault/vault-open'

const persistedVault = JSON.stringify({
  version: 1,
  qrs: [],
  collections: [
    { id: 'dev', title: 'Dev Tools', createdAt: '1', updatedAt: '1' },
    { id: 'foo', title: 'Foo', createdAt: '1', updatedAt: '1' },
  ],
  collectionItems: [],
})

describe('inline collection creation through the Vault interface', () => {
  it('trims the submitted title before matching or creating', () => {
    const { store, write } = setupStore()

    expect(store.collection.selectOrCreate('  Dev Tools  ')).toEqual({
      kind: 'existing',
      id: 'dev',
    })
    expect(write).not.toHaveBeenCalled()
  })

  it('matches duplicate titles case-sensitively', () => {
    const { store } = setupStore()

    expect(store.collection.selectOrCreate('foo')).toEqual({
      kind: 'created',
      id: 'new-collection',
    })
    expect(store.getSnapshot().getCollection('new-collection')?.title).toBe('foo')
  })

  it('returns empty for whitespace-only titles', () => {
    const { store, write } = setupStore()

    expect(store.collection.selectOrCreate('   ')).toEqual({ kind: 'empty' })
    expect(write).not.toHaveBeenCalled()
  })
})

function setupStore() {
  let persisted = persistedVault
  const write = vi.fn((next: string) => {
    persisted = next
  })
  const opened = openVaultStore({
    storage: { read: () => persisted, write },
    now: () => '2026-07-15T00:00:00.000Z',
    nextId: () => 'new-collection',
  })
  if (opened.kind !== 'ready') throw new Error('expected ready Vault')
  return { store: opened.store, write }
}
