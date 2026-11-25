import type { PreviewBlock } from '../practice/types'

// C3: Equal raw text is not enough. Position and parsed meaning must also be unchanged.
export function reuseBlocks(previous: PreviewBlock[], next: PreviewBlock[]): PreviewBlock[] {
  return next.map((block, index) => (previous[index]?.raw === block.raw ? previous[index] : block))
}
