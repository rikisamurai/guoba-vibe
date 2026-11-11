import type { Decoder } from '../practice/types'

// A2: Keep one decoder and preserve incomplete UTF-8 bytes between reads.
export function createDecoder(): Decoder {
  return {
    push: (bytes) => new TextDecoder().decode(bytes),
    finish: () => '',
  }
}
