import { describe, it, expect } from 'vitest'
import { qrAffectedPaths, collectionAffectedPaths } from '@/lib/revalidate-paths'

describe('qrAffectedPaths', () => {
  it('includes the QR detail page', () => {
    expect(qrAffectedPaths('abc12345', [])).toContain('/q/abc12345')
  })

  it('includes one collection page per membership', () => {
    const paths = qrAffectedPaths('abc12345', ['col1', 'col2'])
    expect(paths).toContain('/c/col1')
    expect(paths).toContain('/c/col2')
  })

  it('does not include /admin (admin is cookie-gated and stays dynamic)', () => {
    expect(qrAffectedPaths('abc12345', ['col1'])).not.toContain('/admin')
  })

  it('dedupes repeated collection ids', () => {
    const paths = qrAffectedPaths('abc12345', ['col1', 'col1', 'col2'])
    expect(paths.filter((p) => p === '/c/col1')).toHaveLength(1)
  })

  it('works with zero collections (orphan QR)', () => {
    expect(qrAffectedPaths('abc12345', [])).toEqual(['/q/abc12345'])
  })
})

describe('collectionAffectedPaths', () => {
  it('includes the collection detail page', () => {
    expect(collectionAffectedPaths('col1', [])).toContain('/c/col1')
  })

  it('cascades into every QR page in the collection (titles render as pills)', () => {
    const paths = collectionAffectedPaths('col1', ['qr1', 'qr2'])
    expect(paths).toContain('/q/qr1')
    expect(paths).toContain('/q/qr2')
  })

  it('does not include /admin', () => {
    expect(collectionAffectedPaths('col1', ['qr1'])).not.toContain('/admin')
  })

  it('dedupes repeated qr ids', () => {
    const paths = collectionAffectedPaths('col1', ['qr1', 'qr1'])
    expect(paths.filter((p) => p === '/q/qr1')).toHaveLength(1)
  })

  it('works with empty collection', () => {
    expect(collectionAffectedPaths('col1', [])).toEqual(['/c/col1'])
  })
})
