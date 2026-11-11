import { describe, expect, it, vi } from 'vitest'

import { decodeUtf8 } from './utf8'

async function* from<T>(items: readonly T[]): AsyncGenerator<T> {
  yield* items
}

describe('decodeUtf8', () => {
  it('preserves Unicode split across every byte boundary and reports chunks', async () => {
    const bytes = new TextEncoder().encode('你🙂')
    const onChunk = vi.fn()
    const output: string[] = []

    for await (const text of decodeUtf8(from(Array.from(bytes, (byte) => Uint8Array.of(byte))), {
      onChunk,
    })) {
      output.push(text)
    }

    expect(output.join('')).toBe('你🙂')
    expect(onChunk).toHaveBeenCalledTimes(bytes.byteLength)
  })
})
