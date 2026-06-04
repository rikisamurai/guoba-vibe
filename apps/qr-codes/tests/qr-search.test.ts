import { describe, expect, it } from 'vitest'

import { qrMatchesSearch } from '@/lib/qr-search'

const row = {
  title: 'Buyer conversion',
  description: 'Campaign QA deep link',
  url: 'xhsdiscover://rn/wakanda/buyer-conversion?sku_id=1&title=%E6%B5%8B%E8%AF%95',
}

describe('qrMatchesSearch', () => {
  it('matches title, description, and raw url text', () => {
    expect(qrMatchesSearch(row, 'buyer')).toBe(true)
    expect(qrMatchesSearch(row, 'campaign')).toBe(true)
    expect(qrMatchesSearch(row, 'sku_id')).toBe(true)
  })

  it('matches parsed scheme, path, and decoded query values', () => {
    expect(qrMatchesSearch(row, 'xhsdiscover')).toBe(true)
    expect(qrMatchesSearch(row, 'wakanda/buyer')).toBe(true)
    expect(qrMatchesSearch(row, '测试')).toBe(true)
  })

  it('ignores surrounding whitespace and case', () => {
    expect(qrMatchesSearch(row, '  CAMPAIGN  ')).toBe(true)
  })

  it('returns false when no searchable field matches', () => {
    expect(qrMatchesSearch(row, 'checkout')).toBe(false)
  })
})
