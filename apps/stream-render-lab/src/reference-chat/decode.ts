import type { Decoder } from '../practice/types'

export function createDecoder(): Decoder {
  const decoder = new TextDecoder()
  return {
    push: (bytes) => decoder.decode(bytes, { stream: true }),
    finish: () => decoder.decode(),
  }
}
