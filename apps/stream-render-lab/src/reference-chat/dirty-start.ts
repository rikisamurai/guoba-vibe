import type { ParsedBlockInfo } from '../practice/types'

export function dirtyBlockIndex(previous: ParsedBlockInfo[]): number | null {
  if (previous.length < 2 || previous.some((block) => block.hasDefinition)) return null
  const last = previous.length - 1
  // A trailing paragraph can become an item of the preceding list when its marker arrives.
  return previous[last - 1].type === 'list' ? last - 1 : last
}
