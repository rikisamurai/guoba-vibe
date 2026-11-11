import type { PreviewBlock } from '../practice/types'

export function reuseBlocks(previous: PreviewBlock[], next: PreviewBlock[]): PreviewBlock[] {
  return next.map((block, index) => {
    const prior = previous[index]
    const unchanged =
      prior?.raw === block.raw &&
      prior.start === block.start &&
      JSON.stringify(prior.node) === JSON.stringify(block.node)
    return unchanged ? prior : block
  })
}
