import { describe, expect, it } from 'vitest'

import { resolveInlineCollectionTitle } from '@/app/qr-detail/inline-collection-create'
import type { Collection } from '@/lib/storage'

const collections: Collection[] = [
  { id: 'dev', title: 'Dev Tools', createdAt: '1', updatedAt: '1' },
  { id: 'foo', title: 'Foo', createdAt: '1', updatedAt: '1' },
]

describe('resolveInlineCollectionTitle', () => {
  it('trims the submitted title before matching or creating', () => {
    expect(resolveInlineCollectionTitle(collections, '  Dev Tools  ')).toEqual({
      kind: 'existing',
      title: 'Dev Tools',
      collection: collections[0],
    })
  })

  it('matches duplicate titles case-sensitively', () => {
    expect(resolveInlineCollectionTitle(collections, 'foo')).toEqual({
      kind: 'new',
      title: 'foo',
    })
  })

  it('returns empty for whitespace-only titles', () => {
    expect(resolveInlineCollectionTitle(collections, '   ')).toEqual({
      kind: 'empty',
      title: '',
    })
  })
})
