import { describe, expect, it } from 'vitest'

import { isValidAccessKey } from './auth.js'

describe('isValidAccessKey', () => {
  it('accepts a key from the comma-separated list, ignoring whitespace', () => {
    expect(isValidAccessKey('bravo', 'alpha, bravo ,charlie')).toBe(true)
    expect(isValidAccessKey(' bravo ', 'alpha,bravo')).toBe(true)
  })

  it('rejects unknown, empty, or missing keys', () => {
    expect(isValidAccessKey('delta', 'alpha,bravo')).toBe(false)
    expect(isValidAccessKey('', 'alpha,bravo')).toBe(false)
    expect(isValidAccessKey(null, 'alpha,bravo')).toBe(false)
  })

  it('rejects everything when the env var is unset or empty', () => {
    expect(isValidAccessKey('alpha', undefined)).toBe(false)
    expect(isValidAccessKey('alpha', '')).toBe(false)
    expect(isValidAccessKey('', '')).toBe(false)
  })
})
