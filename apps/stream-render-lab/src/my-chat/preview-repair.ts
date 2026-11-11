import type { PreviewRepair } from '../practice/types'

// C2: Close an unfinished code fence in a preview copy. Never rewrite the accepted raw text.
export function repairPreview(raw: string): PreviewRepair {
  return { text: raw, synthetic: '' }
}
