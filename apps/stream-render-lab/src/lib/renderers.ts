import type { ComponentType } from 'react'
import { StreamMarkdownP0, StreamMarkdownP1, StreamMarkdownP2 } from 'stream-render-core'

export type RendererId = 'p0' | 'p1' | 'p2'

export interface RendererProps {
  text: string
  streaming?: boolean
  className?: string
  mermaidLive?: boolean
}

export interface RendererEntry {
  label: string
  Component: ComponentType<RendererProps>
}

export const RENDERERS: Record<RendererId, RendererEntry> = {
  p0: { label: 'P0 · 全文重解析', Component: StreamMarkdownP0 },
  p1: { label: 'P1 · 稳定前缀 + 调度器', Component: StreamMarkdownP1 },
  p2: { label: 'P2 · 重型节点（Shiki/Mermaid）', Component: StreamMarkdownP2 },
}
