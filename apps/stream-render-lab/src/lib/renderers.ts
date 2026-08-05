import type { ComponentType } from 'react'
import { StreamMarkdownP0, StreamMarkdownP1 } from 'stream-render-core'

export type RendererId = 'p0' | 'p1'

export interface RendererProps {
  text: string
  streaming?: boolean
  className?: string
}

export interface RendererEntry {
  label: string
  Component: ComponentType<RendererProps>
}

/** P2 渲染器实现后在此追加，UI 无需改动 */
export const RENDERERS: Record<RendererId, RendererEntry> = {
  p0: { label: 'P0 · 全文重解析', Component: StreamMarkdownP0 },
  p1: { label: 'P1 · 稳定前缀 + 调度器', Component: StreamMarkdownP1 },
}
