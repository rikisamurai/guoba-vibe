import { describe, expect, it } from 'vitest'

import { sortQrsByRecent } from '@/lib/vault'

const qr = (id: string, createdAt: string, updatedAt = createdAt) => ({
  id,
  url: `xhsdiscover://rn/${id}`,
  createdAt,
  updatedAt,
})

describe('sortQrsByRecent', () => {
  it('puts newly created QR codes first', () => {
    const result = sortQrsByRecent([
      qr('old', '2026-01-01T00:00:00.000Z'),
      qr('new', '2026-01-02T00:00:00.000Z'),
    ])

    expect(result.map((item) => item.id)).toEqual(['new', 'old'])
  })

  it('prioritizes edited QR codes by updatedAt', () => {
    const result = sortQrsByRecent([
      qr('newer-created', '2026-01-02T00:00:00.000Z'),
      qr('edited', '2026-01-01T00:00:00.000Z', '2026-01-03T00:00:00.000Z'),
    ])

    expect(result.map((item) => item.id)).toEqual(['edited', 'newer-created'])
  })

  it('keeps input order when timestamps match and does not mutate input', () => {
    const input = [
      qr('a', '2026-01-01T00:00:00.000Z'),
      qr('b', '2026-01-01T00:00:00.000Z'),
      qr('c', '2026-01-01T00:00:00.000Z'),
    ]

    const result = sortQrsByRecent(input)

    expect(result.map((item) => item.id)).toEqual(['a', 'b', 'c'])
    expect(input.map((item) => item.id)).toEqual(['a', 'b', 'c'])
    expect(result).not.toBe(input)
  })
})
