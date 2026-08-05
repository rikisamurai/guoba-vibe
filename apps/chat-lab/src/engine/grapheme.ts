const segmenter = new Intl.Segmenter(undefined, { granularity: 'grapheme' })

/**
 * Largest grapheme-cluster boundary <= index. Keeps a reveal cursor from
 * splitting emoji ZWJ sequences, flags, or combining characters.
 */
export function floorGraphemeBoundary(text: string, index: number): number {
  if (index <= 0) return 0
  if (index >= text.length) return text.length
  const containing = segmenter.segment(text).containing(index)
  return containing === undefined ? text.length : containing.index
}

/** Boundary strictly after index — used to guarantee cursor progress. */
export function nextGraphemeBoundary(text: string, index: number): number {
  if (index >= text.length) return text.length
  const containing = segmenter.segment(text).containing(index)
  return containing === undefined ? text.length : containing.index + containing.segment.length
}
