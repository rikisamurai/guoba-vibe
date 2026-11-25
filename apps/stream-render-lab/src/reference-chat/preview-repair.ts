import type { PreviewRepair } from '../practice/types'

export function repairPreview(raw: string): PreviewRepair {
  let open: { marker: string; size: number } | undefined
  for (const line of raw.split(/\r\n|\r|\n/)) {
    const fence = /^ {0,3}(`{3,}|~{3,})(.*)$/.exec(line)
    if (!fence) continue
    const marker = fence[1][0]
    const size = fence[1].length
    if (!open) open = { marker, size }
    else if (marker === open.marker && size >= open.size && fence[2].trim() === '') open = undefined
  }
  if (!open) return { text: raw, synthetic: '' }
  const synthetic = (/[\r\n]$/.test(raw) ? '' : '\n') + open.marker.repeat(open.size)
  return { text: raw + synthetic, synthetic }
}
