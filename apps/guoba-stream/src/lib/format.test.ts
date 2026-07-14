import { describe, expect, it } from 'vitest'

import { formatDuration } from './format'

describe('formatDuration', () => {
  it('formats milliseconds as m:ss', () => {
    expect(formatDuration(9301)).toBe('0:09')
    expect(formatDuration(75000)).toBe('1:15')
    expect(formatDuration(600000)).toBe('10:00')
  })
})
