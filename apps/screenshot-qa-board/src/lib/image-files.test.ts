import { describe, expect, it } from 'vitest'

import { maxImageBytes, validateImageFile } from './image-files'

describe('image file validation', () => {
  it('accepts images within the local storage budget', () => {
    expect(validateImageFile({ type: 'image/png', size: maxImageBytes })).toBe('')
  })

  it('rejects non-images and oversized captures with actionable errors', () => {
    expect(validateImageFile({ type: 'application/pdf', size: 100 })).toContain('PNG')
    expect(validateImageFile({ type: 'image/svg+xml', size: 100 })).toContain('PNG')
    expect(validateImageFile({ type: 'image/png', size: maxImageBytes + 1 })).toContain('900KB')
  })
})
