import { describe, expect, it } from 'vitest'

import {
  decodeVaultDocument,
  type VaultIssueCode,
  type VaultReceived,
} from '@/app/vault/vault-document-decoder'

const timestamp = '2026-01-01T00:00:00.000Z'

function validFixture() {
  return {
    version: 1,
    qrs: [
      {
        id: 'q',
        title: 'QR',
        description: 'Description',
        url: 'https://example.com',
        queryParams: [{ id: 'row', key: 'mode', value: 'safe', enabled: true }],
        createdAt: timestamp,
        updatedAt: timestamp,
      },
    ],
    collections: [
      {
        id: 'c',
        title: 'Collection',
        description: 'Description',
        createdAt: timestamp,
        updatedAt: timestamp,
      },
    ],
    collectionItems: [{ collectionId: 'c', qrId: 'q' }],
  }
}

type Fixture = ReturnType<typeof validFixture>
type DecoderCase = Readonly<{
  name: string
  path: string
  code: VaultIssueCode
  received: VaultReceived
  mutate: (fixture: Fixture) => void
}>

const TYPE_CASES: readonly DecoderCase[] = [
  fieldCase('version', '$.version', 'expected-version-1', (value) =>
    Reflect.set(value, 'version', 2),
  ),
  fieldCase('qrs array', '$.qrs', 'expected-array', (value) => Reflect.set(value, 'qrs', 1)),
  fieldCase(
    'QR object',
    '$.qrs[0]',
    'expected-object',
    (value) => Reflect.set(value.qrs, 0, null),
    'null',
  ),
  fieldCase('QR id', '$.qrs[0].id', 'expected-string', (value) =>
    Reflect.set(value.qrs[0], 'id', 1),
  ),
  fieldCase('QR title', '$.qrs[0].title', 'expected-string', (value) =>
    Reflect.set(value.qrs[0], 'title', 1),
  ),
  fieldCase('QR description', '$.qrs[0].description', 'expected-string', (value) =>
    Reflect.set(value.qrs[0], 'description', 1),
  ),
  fieldCase('QR URL', '$.qrs[0].url', 'expected-string', (value) =>
    Reflect.set(value.qrs[0], 'url', 1),
  ),
  fieldCase('QR query params', '$.qrs[0].queryParams', 'expected-array', (value) =>
    Reflect.set(value.qrs[0], 'queryParams', 1),
  ),
  fieldCase(
    'query row object',
    '$.qrs[0].queryParams[0]',
    'expected-object',
    (value) => Reflect.set(value.qrs[0].queryParams, 0, null),
    'null',
  ),
  fieldCase('query row id', '$.qrs[0].queryParams[0].id', 'expected-string', (value) =>
    Reflect.set(value.qrs[0].queryParams[0], 'id', 1),
  ),
  fieldCase('query row key', '$.qrs[0].queryParams[0].key', 'expected-string', (value) =>
    Reflect.set(value.qrs[0].queryParams[0], 'key', 1),
  ),
  fieldCase('query row value', '$.qrs[0].queryParams[0].value', 'expected-string', (value) =>
    Reflect.set(value.qrs[0].queryParams[0], 'value', 1),
  ),
  fieldCase(
    'query row enabled',
    '$.qrs[0].queryParams[0].enabled',
    'expected-boolean',
    (value) => Reflect.set(value.qrs[0].queryParams[0], 'enabled', 'yes'),
    'string',
  ),
  fieldCase('QR createdAt', '$.qrs[0].createdAt', 'expected-string', (value) =>
    Reflect.set(value.qrs[0], 'createdAt', 1),
  ),
  fieldCase('QR updatedAt', '$.qrs[0].updatedAt', 'expected-string', (value) =>
    Reflect.set(value.qrs[0], 'updatedAt', 1),
  ),
  fieldCase('collections array', '$.collections', 'expected-array', (value) =>
    Reflect.set(value, 'collections', 1),
  ),
  fieldCase(
    'Collection object',
    '$.collections[0]',
    'expected-object',
    (value) => Reflect.set(value.collections, 0, null),
    'null',
  ),
  fieldCase('Collection id', '$.collections[0].id', 'expected-string', (value) =>
    Reflect.set(value.collections[0], 'id', 1),
  ),
  fieldCase('Collection title', '$.collections[0].title', 'expected-string', (value) =>
    Reflect.set(value.collections[0], 'title', 1),
  ),
  fieldCase('Collection description', '$.collections[0].description', 'expected-string', (value) =>
    Reflect.set(value.collections[0], 'description', 1),
  ),
  fieldCase('Collection createdAt', '$.collections[0].createdAt', 'expected-string', (value) =>
    Reflect.set(value.collections[0], 'createdAt', 1),
  ),
  fieldCase('Collection updatedAt', '$.collections[0].updatedAt', 'expected-string', (value) =>
    Reflect.set(value.collections[0], 'updatedAt', 1),
  ),
  fieldCase('relations array', '$.collectionItems', 'expected-array', (value) =>
    Reflect.set(value, 'collectionItems', 1),
  ),
  fieldCase(
    'relation object',
    '$.collectionItems[0]',
    'expected-object',
    (value) => Reflect.set(value.collectionItems, 0, null),
    'null',
  ),
  fieldCase(
    'relation collectionId',
    '$.collectionItems[0].collectionId',
    'expected-string',
    (value) => Reflect.set(value.collectionItems[0], 'collectionId', 1),
  ),
  fieldCase('relation qrId', '$.collectionItems[0].qrId', 'expected-string', (value) =>
    Reflect.set(value.collectionItems[0], 'qrId', 1),
  ),
]

const REQUIRED_CASES = TYPE_CASES.filter(({ name }) =>
  [
    'version',
    'qrs array',
    'QR id',
    'QR URL',
    'query row id',
    'query row key',
    'query row value',
    'query row enabled',
    'QR createdAt',
    'QR updatedAt',
    'collections array',
    'Collection id',
    'Collection title',
    'Collection createdAt',
    'Collection updatedAt',
    'relations array',
    'relation collectionId',
    'relation qrId',
  ].includes(name),
)

function fieldCase(
  name: string,
  path: string,
  code: VaultIssueCode,
  mutate: (fixture: Fixture) => void,
  received: VaultReceived = 'number',
): DecoderCase {
  return { name, path, code, received, mutate }
}

function removePath(fixture: Fixture, path: string) {
  const key = path.slice(path.lastIndexOf('.') + 1)
  if (path.startsWith('$.qrs[0].queryParams[0]')) {
    Reflect.deleteProperty(fixture.qrs[0].queryParams[0], key)
  } else if (path.startsWith('$.qrs[0]')) {
    Reflect.deleteProperty(fixture.qrs[0], key)
  } else if (path.startsWith('$.collections[0]')) {
    Reflect.deleteProperty(fixture.collections[0], key)
  } else if (path.startsWith('$.collectionItems[0]')) {
    Reflect.deleteProperty(fixture.collectionItems[0], key)
  } else {
    Reflect.deleteProperty(fixture, key)
  }
}

describe('Vault document decoder', () => {
  it('distinguishes malformed JSON from a valid JSON value with the wrong root type', () => {
    expect(decodeVaultDocument('{')).toEqual({
      kind: 'invalid',
      issues: [{ path: '$', code: 'invalid-json', received: 'invalid-json' }],
      truncated: false,
    })
    expect(decodeVaultDocument('null')).toEqual({
      kind: 'invalid',
      issues: [{ path: '$', code: 'expected-object', received: 'null' }],
      truncated: false,
    })
  })

  it.each(TYPE_CASES)('rejects a wrong type for $name', ({ path, code, received, mutate }) => {
    const fixture = validFixture()
    mutate(fixture)

    expect(decodeVaultDocument(JSON.stringify(fixture))).toEqual({
      kind: 'invalid',
      issues: [{ path, code, received }],
      truncated: false,
    })
  })

  it.each(REQUIRED_CASES)('rejects a missing $name', ({ path, code }) => {
    const fixture = validFixture()
    removePath(fixture, path)

    expect(decodeVaultDocument(JSON.stringify(fixture))).toEqual({
      kind: 'invalid',
      issues: [{ path, code, received: 'missing' }],
      truncated: false,
    })
  })

  it('accepts absent optional fields', () => {
    const fixture = validFixture()
    Reflect.deleteProperty(fixture.qrs[0], 'title')
    Reflect.deleteProperty(fixture.qrs[0], 'description')
    Reflect.deleteProperty(fixture.qrs[0], 'queryParams')
    Reflect.deleteProperty(fixture.collections[0], 'description')

    expect(decodeVaultDocument(JSON.stringify(fixture)).kind).toBe('valid')
  })

  it('reports optional field and nested query-row type mismatches in document order', () => {
    const raw = JSON.stringify({
      version: 1,
      qrs: [
        {
          id: 'q',
          title: null,
          url: 'https://example.com',
          queryParams: [{ id: 'row', key: 'mode', value: 'safe', enabled: 'yes' }],
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-01T00:00:00.000Z',
        },
      ],
      collections: [
        {
          id: 'c',
          title: 'Collection',
          description: 1,
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-01T00:00:00.000Z',
        },
      ],
      collectionItems: [{ collectionId: 'c', qrId: 'q' }],
    })

    expect(decodeVaultDocument(raw)).toEqual({
      kind: 'invalid',
      issues: [
        { path: '$.qrs[0].title', code: 'expected-string', received: 'null' },
        {
          path: '$.qrs[0].queryParams[0].enabled',
          code: 'expected-boolean',
          received: 'string',
        },
        {
          path: '$.collections[0].description',
          code: 'expected-string',
          received: 'number',
        },
      ],
      truncated: false,
    })
  })
})
