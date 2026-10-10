import { parseMarkdownBlocks } from './canonical'
import { repairPreview } from './repair'
import type {
  MarkdownDiagnosticCode,
  PreviewOptions,
  RenderBlock,
  RenderDocument,
  RenderNode,
} from './types'

function projectRawRanges(blocks: RenderBlock[], raw: string): RenderBlock[] {
  return blocks.map((block, index) => {
    const start = Math.min(block.range.start, raw.length)
    const nextStart = blocks[index + 1]?.range.start
    const end = Math.min(nextStart ?? raw.length, raw.length)
    return { ...block, raw: raw.slice(start, end), range: { start, end } }
  })
}

function reuseStableBlocks(blocks: RenderBlock[], previous?: RenderDocument): RenderBlock[] {
  if (!previous) return blocks
  return blocks.map((block, index) => {
    const prior = previous.blocks[index]
    const sameSource =
      prior?.type === block.type &&
      prior.raw === block.raw &&
      prior.range.start === block.range.start &&
      prior.range.end === block.range.end
    const sameSemantics = sameSource && JSON.stringify(prior.node) === JSON.stringify(block.node)
    return sameSemantics ? prior : block
  })
}

function definitionOffsetInNode(node: RenderNode): number | undefined {
  if (node.type === 'definition' || node.type === 'footnoteDefinition') {
    return node.position?.start.offset ?? 0
  }
  for (const child of node.children ?? []) {
    const offset = definitionOffsetInNode(child)
    if (offset !== undefined) return offset
  }
  return undefined
}

function definitionOffset(blocks: RenderBlock[]): number | undefined {
  for (const block of blocks) {
    const offset = definitionOffsetInNode(block.node)
    if (offset !== undefined) return offset
  }
  return undefined
}

function fullFallback(
  raw: string,
  visible: string,
  repair: RenderDocument['repair'],
  reason: MarkdownDiagnosticCode,
  offset: number,
  priorParseWork = 0,
): RenderDocument {
  return {
    raw,
    visible,
    blocks: projectRawRanges(parseMarkdownBlocks(visible), raw),
    diagnostics: [{ code: reason, offset }],
    repair,
    work: {
      parsedCodeUnits: visible.length + priorParseWork,
      strategy: 'full-fallback',
      fallbackReason: reason,
    },
  }
}

function physicalLineStart(raw: string, offset: number): number {
  let start = offset
  while (start > 0 && raw[start - 1] !== '\n' && raw[start - 1] !== '\r') start -= 1
  return start
}

function lineBreakCount(raw: string, end: number): number {
  let count = 0
  for (let index = 0; index < end; index += 1) {
    if (raw[index] === '\r') {
      count += 1
      if (raw[index + 1] === '\n' && index + 1 < end) index += 1
    } else if (raw[index] === '\n') {
      count += 1
    }
  }
  return count
}

function restoreRootBoundary(blocks: RenderBlock[], raw: string): RenderBlock[] {
  const [first, ...rest] = blocks
  const start = first?.node.position?.start.offset
  if (!first || start === undefined || start === first.range.start) return blocks
  return [
    {
      ...first,
      id: `block-${start}-${first.type}`,
      raw: raw.slice(start, first.range.end),
      range: { start, end: first.range.end },
    },
    ...rest,
  ]
}

function parseM3(raw: string, previous: RenderDocument): RenderDocument {
  const repair = repairPreview(raw)
  if (!raw.startsWith(previous.raw)) {
    return fullFallback(raw, repair.text, repair, 'non_append_update', 0)
  }
  if (previous.raw.length === 0) {
    return parsePreview(raw, { mode: 'M2', previous })
  }
  const globalOffset = definitionOffset(previous.blocks)
  if (globalOffset !== undefined) {
    return fullFallback(raw, repair.text, repair, 'global_definition_fallback', globalOffset)
  }
  if (previous.blocks.length < 2) {
    return fullFallback(raw, repair.text, repair, 'no_quiescent_checkpoint', 0)
  }
  const rootStart = previous.blocks.at(-1)?.range.start ?? 0
  const dirtyStart = physicalLineStart(raw, rootStart)
  const lineBase = lineBreakCount(raw, dirtyStart)
  const tail = repair.text.slice(dirtyStart)
  const parsedTail = restoreRootBoundary(
    projectRawRanges(parseMarkdownBlocks(tail, dirtyStart, lineBase), raw),
    raw,
  )
  const tailDefinitionOffset = definitionOffset(parsedTail)
  if (tailDefinitionOffset !== undefined) {
    return fullFallback(
      raw,
      repair.text,
      repair,
      'global_definition_fallback',
      tailDefinitionOffset,
      tail.length,
    )
  }
  return {
    raw,
    visible: repair.text,
    blocks: [...previous.blocks.slice(0, -1), ...parsedTail],
    diagnostics: [],
    repair,
    work: { parsedCodeUnits: tail.length, strategy: 'suffix' },
  }
}

export function parsePreview(raw: string, options: PreviewOptions): RenderDocument {
  if (options.mode === 'M3' && options.previous) return parseM3(raw, options.previous)
  const repair = repairPreview(raw)
  const parsed = projectRawRanges(parseMarkdownBlocks(repair.text), raw)
  const blocks = reuseStableBlocks(parsed, options.previous)
  return {
    raw,
    visible: repair.text,
    blocks,
    diagnostics: [],
    repair,
    work: { parsedCodeUnits: repair.text.length, strategy: 'full' },
  }
}
