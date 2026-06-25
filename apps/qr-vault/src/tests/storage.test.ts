import { describe, expect, it } from 'vitest'

import {
  createEmptyVault,
  deleteCollection,
  exportVaultJson,
  mergeVaultData,
  parseVaultData,
  replaceVaultData,
  upsertQr,
} from '@/lib/storage'

const baseVault = createEmptyVault()

describe('parseVaultData', () => {
  it('accepts a valid versioned vault document', () => {
    expect(parseVaultData(JSON.stringify(baseVault))).toEqual(baseVault)
  })

  it('accepts persisted query param row state', () => {
    const vault = {
      ...baseVault,
      qrs: [
        {
          id: 'qr',
          url: 'xhsdiscover://rn/page?mode=RN',
          queryParams: [
            { id: 'mode', key: 'mode', value: 'RN', enabled: true },
            { id: 'host', key: 'hostId', value: '600982ae0000000001000ee4', enabled: false },
          ],
          createdAt: '1',
          updatedAt: '1',
        },
      ],
    }

    expect(parseVaultData(JSON.stringify(vault))).toEqual(vault)
  })

  it('returns null for invalid JSON or invalid shape', () => {
    expect(parseVaultData('{')).toBeNull()
    expect(parseVaultData(JSON.stringify({ version: 2 }))).toBeNull()
  })
})

describe('mergeVaultData', () => {
  it('overwrites same-id records and keeps local-only records', () => {
    const local = {
      version: 1 as const,
      qrs: [
        {
          id: 'local',
          title: 'Local',
          url: 'xhsdiscover://rn/local',
          createdAt: '1',
          updatedAt: '1',
        },
        { id: 'same', title: 'Old', url: 'xhsdiscover://rn/old', createdAt: '1', updatedAt: '1' },
      ],
      collections: [{ id: 'c1', title: 'Local collection', createdAt: '1', updatedAt: '1' }],
      collectionItems: [{ collectionId: 'c1', qrId: 'local' }],
    }
    const incoming = {
      version: 1 as const,
      qrs: [
        { id: 'same', title: 'New', url: 'xhsdiscover://rn/new', createdAt: '2', updatedAt: '2' },
      ],
      collections: [{ id: 'c2', title: 'Imported', createdAt: '2', updatedAt: '2' }],
      collectionItems: [{ collectionId: 'c2', qrId: 'same' }],
    }

    const merged = mergeVaultData(local, incoming)

    expect(merged.qrs.map((qr) => qr.id).toSorted()).toEqual(['local', 'same'])
    expect(merged.qrs.find((qr) => qr.id === 'same')?.title).toBe('New')
    expect(merged.collections.map((collection) => collection.id).toSorted()).toEqual(['c1', 'c2'])
    expect(merged.collectionItems).toEqual([
      { collectionId: 'c1', qrId: 'local' },
      { collectionId: 'c2', qrId: 'same' },
    ])
  })
})

describe('replaceVaultData', () => {
  it('returns the incoming document unchanged', () => {
    const incoming = {
      version: 1 as const,
      qrs: [{ id: 'incoming', url: 'xhsdiscover://rn/incoming', createdAt: '2', updatedAt: '2' }],
      collections: [],
      collectionItems: [],
    }

    expect(replaceVaultData(baseVault, incoming)).toEqual(incoming)
  })
})

describe('upsertQr', () => {
  it('adds a new QR and links multiple collections', () => {
    const result = upsertQr(
      {
        ...baseVault,
        collections: [
          { id: 'a', title: 'A', createdAt: '1', updatedAt: '1' },
          { id: 'b', title: 'B', createdAt: '1', updatedAt: '1' },
        ],
      },
      {
        title: 'Buyer',
        url: 'xhsdiscover://rn/wakanda/buyer-conversion',
        collectionIds: ['a', 'b'],
      },
      'now',
    )

    expect(result.qrs).toHaveLength(1)
    expect(result.collectionItems).toEqual([
      { collectionId: 'a', qrId: result.qrs[0].id },
      { collectionId: 'b', qrId: result.qrs[0].id },
    ])
  })

  it('persists query param row state separately from the effective URL', () => {
    const result = upsertQr(
      baseVault,
      {
        title: 'Buyer',
        url: 'xhsdiscover://rn/page?mode=RN',
        queryParams: [
          { id: 'mode', key: 'mode', value: 'RN', enabled: true },
          { id: 'host', key: 'hostId', value: '600982ae0000000001000ee4', enabled: false },
        ],
      },
      'now',
    )

    expect(result.qrs[0]).toMatchObject({
      url: 'xhsdiscover://rn/page?mode=RN',
      queryParams: [
        { id: 'mode', key: 'mode', value: 'RN', enabled: true },
        { id: 'host', key: 'hostId', value: '600982ae0000000001000ee4', enabled: false },
      ],
    })
  })
})

describe('deleteCollection', () => {
  it('removes the collection and unhooks its membership records, leaving QRs intact', () => {
    const result = deleteCollection(
      {
        version: 1,
        qrs: [
          { id: 'q1', url: 'xhsdiscover://rn/a', createdAt: '1', updatedAt: '1' },
          { id: 'q2', url: 'xhsdiscover://rn/b', createdAt: '1', updatedAt: '1' },
        ],
        collections: [
          { id: 'keep', title: 'Keep', createdAt: '1', updatedAt: '1' },
          { id: 'drop', title: 'Drop', createdAt: '1', updatedAt: '1' },
        ],
        collectionItems: [
          { collectionId: 'keep', qrId: 'q1' },
          { collectionId: 'drop', qrId: 'q1' },
          { collectionId: 'drop', qrId: 'q2' },
        ],
      },
      'drop',
    )

    expect(result.collections.map((collection) => collection.id)).toEqual(['keep'])
    expect(result.collectionItems).toEqual([{ collectionId: 'keep', qrId: 'q1' }])
    expect(result.qrs.map((qr) => qr.id).toSorted()).toEqual(['q1', 'q2'])
  })
})

describe('exportVaultJson', () => {
  it('exports pretty JSON that can be parsed back into vault data', () => {
    const exported = exportVaultJson({
      version: 1,
      qrs: [],
      collections: [],
      collectionItems: [],
    })

    expect(JSON.parse(exported)).toEqual({
      version: 1,
      qrs: [],
      collections: [],
      collectionItems: [],
    })
    expect(exported).toContain('\n  ')
  })
})
