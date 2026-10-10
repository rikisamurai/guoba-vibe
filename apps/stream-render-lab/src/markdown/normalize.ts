import type { RenderDocument } from './types'

export function normalizeRenderIr(document: RenderDocument): unknown {
  return {
    raw: document.raw,
    visible: document.visible,
    blocks: document.blocks.map(({ type, raw, range, node }) => ({ type, raw, range, node })),
  }
}
