import { describe, expect, it } from 'vitest'

import {
  buildSharePath,
  buildShareUrl,
  buildUrlFromParts,
  buildUrlFromQueryRows,
  normalizeQueryRows,
  parseDeepLink,
  queryToRows,
} from '@/lib/url'

describe('parseDeepLink', () => {
  it('parses a xhsdiscover deeplink with query', () => {
    const result = parseDeepLink('xhsdiscover://rn/wakanda/buyer-conversion?sku_id=1&item_id=2')

    expect(result).toEqual({
      raw: 'xhsdiscover://rn/wakanda/buyer-conversion?sku_id=1&item_id=2',
      isValid: true,
      isEmpty: false,
      scheme: 'xhsdiscover',
      path: 'rn/wakanda/buyer-conversion',
      query: { sku_id: '1', item_id: '2' },
    })
  })

  it('collapses repeated query keys to the last value', () => {
    expect(parseDeepLink('xhsdiscover://rn/page?tag=a&tag=b').query).toEqual({ tag: 'b' })
  })

  it('keeps incomplete text invalid while preserving raw input', () => {
    expect(parseDeepLink('xhsdiscover://').isValid).toBe(false)
    expect(parseDeepLink('xhsdiscover://').raw).toBe('xhsdiscover://')
  })
})

describe('buildUrlFromParts', () => {
  it('rebuilds a deeplink from scheme, path, and query rows', () => {
    expect(
      buildUrlFromParts({
        scheme: 'xhsdiscover',
        path: 'rn/wakanda/buyer-conversion',
        query: { sku_id: '1', item_id: '2' },
      }),
    ).toBe('xhsdiscover://rn/wakanda/buyer-conversion?sku_id=1&item_id=2')
  })

  it('encodes query values and ignores empty keys', () => {
    expect(
      buildUrlFromParts({
        scheme: 'xhsdiscover',
        path: 'rn/page',
        query: { keyword: '中文 商品', '': 'ignored' },
      }),
    ).toBe('xhsdiscover://rn/page?keyword=%E4%B8%AD%E6%96%87+%E5%95%86%E5%93%81')
  })
})

describe('normalizeQueryRows', () => {
  it('turns rows into a key-value map and drops empty keys', () => {
    expect(
      normalizeQueryRows([
        { id: 'sku', key: 'sku_id', value: '1', enabled: true },
        { id: 'empty', key: '', value: 'ignored', enabled: true },
        { id: 'item', key: 'item_id', value: '2', enabled: true },
      ]),
    ).toEqual({ sku_id: '1', item_id: '2' })
  })

  it('keeps disabled rows out of the normalized query map', () => {
    expect(
      normalizeQueryRows([
        { id: 'scene', key: 'scene', value: 'common', enabled: true },
        { id: 'host', key: 'hostId', value: '600982ae0000000001000ee4', enabled: false },
      ]),
    ).toEqual({ scene: 'common' })
  })
})

describe('query rows', () => {
  it('creates enabled rows from parsed query params', () => {
    expect(queryToRows({ mode: 'RN', scene: 'common' })).toEqual([
      expect.objectContaining({ key: 'mode', value: 'RN', enabled: true }),
      expect.objectContaining({ key: 'scene', value: 'common', enabled: true }),
    ])
  })

  it('rebuilds the effective URL from enabled query rows only', () => {
    expect(
      buildUrlFromQueryRows({
        scheme: 'xhsdiscover',
        path: 'rn/page',
        rows: [
          { id: 'mode', key: 'mode', value: 'RN', enabled: true },
          { id: 'host', key: 'hostId', value: '600982ae0000000001000ee4', enabled: false },
        ],
      }),
    ).toBe('xhsdiscover://rn/page?mode=RN')
  })
})

describe('buildSharePath', () => {
  it('builds a self-contained share route with optional title and description', () => {
    const path = buildSharePath({
      url: 'xhsdiscover://rn/wakanda/buyer-conversion?sku_id=1',
      title: 'Buyer',
      description: 'Debug QR',
    })

    expect(path).toContain('/share?')
    expect(path).toContain('url=')
    expect(path).toContain('title=Buyer')
    expect(path).toContain('description=Debug+QR')
  })
})

describe('buildShareUrl', () => {
  it('builds an absolute hash URL for sharing from the current app location', () => {
    expect(
      buildShareUrl({
        origin: 'https://example.com',
        pathname: '/qr-vault/',
        url: 'https://www.google.com',
        title: 'Google',
        description: 'homepage',
      }),
    ).toBe(
      'https://example.com/qr-vault/#/share?url=https%3A%2F%2Fwww.google.com&title=Google&description=homepage',
    )
  })
})
