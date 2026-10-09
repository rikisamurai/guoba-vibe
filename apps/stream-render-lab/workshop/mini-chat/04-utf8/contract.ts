import { expect, it } from 'vitest'

import { defineStep03Contract, type Step03Api } from '../03-m0-baseline/contract'
import { UTF8_FIXTURE_CHUNKS, UTF8_FIXTURE_TEXT } from './fixture'

export interface Step04Api extends Step03Api {
  decodeUtf8Chunks(chunks: readonly Uint8Array[]): string
}

export function defineStep04Contract(api: Step04Api): void {
  defineStep03Contract(api)

  it('04 decodes UTF-8 across arbitrary byte splits', () => {
    expect(api.decodeUtf8Chunks(UTF8_FIXTURE_CHUNKS)).toBe(UTF8_FIXTURE_TEXT)
  })
}
