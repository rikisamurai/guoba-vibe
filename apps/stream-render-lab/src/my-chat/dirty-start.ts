import type { ParsedBlockInfo } from '../practice/types'

// C4: Return the first block to reparse after an append, or null when only a full parse is safe.
export function dirtyBlockIndex(previous: ParsedBlockInfo[]): number | null {
  return previous.length - 1
}
