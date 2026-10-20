export function advanceVisible(raw: string, current: number, budget = 32): number {
  if (current >= raw.length) return raw.length
  const segmenter = new Intl.Segmenter(undefined, { granularity: 'grapheme' })
  let count = 0
  let end = current
  for (const segment of segmenter.segment(raw.slice(current))) {
    end = current + segment.index + segment.segment.length
    count += 1
    if (count >= budget) break
  }
  return Math.min(end, raw.length)
}
