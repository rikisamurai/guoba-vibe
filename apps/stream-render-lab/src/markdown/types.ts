export interface SourceRange {
  start: number
  end: number
}

export interface RenderPosition {
  start: { line: number; column: number; offset: number }
  end: { line: number; column: number; offset: number }
}

export interface RenderNode {
  type: string
  value?: string
  children?: RenderNode[]
  position?: RenderPosition
  depth?: number
  url?: string
  identifier?: string
  referenceType?: 'shortcut' | 'collapsed' | 'full'
  title?: string | null
  alt?: string | null
  lang?: string | null
  meta?: string | null
  checked?: boolean | null
  spread?: boolean | null
  ordered?: boolean | null
  start?: number | null
  align?: Array<'left' | 'right' | 'center' | null> | null
}

export interface RenderBlock {
  id: string
  type: string
  raw: string
  range: SourceRange
  node: RenderNode
}

export type MarkdownDiagnosticCode =
  | 'global_definition_fallback'
  | 'no_quiescent_checkpoint'
  | 'non_append_update'

export interface MarkdownDiagnostic {
  code: MarkdownDiagnosticCode
  offset: number
}

export interface RepairResult {
  text: string
  syntheticRanges: SourceRange[]
}

export interface ParseWork {
  parsedCodeUnits: number
  strategy: 'full' | 'suffix' | 'full-fallback'
  fallbackReason?: MarkdownDiagnosticCode
}

export interface RenderDocument {
  raw: string
  visible: string
  blocks: RenderBlock[]
  diagnostics: MarkdownDiagnostic[]
  work: ParseWork
  repair?: RepairResult
}

export interface PreviewOptions {
  mode: 'M2' | 'M3'
  previous?: RenderDocument
}
