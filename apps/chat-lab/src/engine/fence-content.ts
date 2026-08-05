import type { BlockFence } from '../types/block'

export interface FenceContent {
  lang: string
  code: string
  closed: boolean
}

/** Extract the inner code from a fenced block raw (without fence lines). */
export function parseFenceContent(raw: string, fence: BlockFence): FenceContent {
  const lines = raw.replace(/\n+$/, '').split('\n')
  const body = lines.slice(1)
  if (fence.closed && body.length > 0 && /^ {0,3}(`{3,}|~{3,})\s*$/.test(body[body.length - 1])) {
    body.pop()
  }
  return { lang: fence.lang, code: body.join('\n'), closed: fence.closed }
}
