import type { ComponentType } from 'react'
import { StreamMarkdownP0 } from 'stream-render-core'

export type RendererId = 'p0'

export interface RendererEntry {
  label: string
  Component: ComponentType<{ text: string; className?: string }>
}

/** P1/P2 渲染器实现后在此追加，UI 无需改动 */
export const RENDERERS: Record<RendererId, RendererEntry> = {
  p0: { label: 'P0 · 全文重解析', Component: StreamMarkdownP0 },
}
