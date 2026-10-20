import type { Root } from 'mdast'
import remarkGfm from 'remark-gfm'
import remarkMath from 'remark-math'
import remarkParse from 'remark-parse'
import { unified } from 'unified'

import { rootToBlocks } from './to-render-ir'
import type { RenderBlock, RenderDocument } from './types'

const parser = unified().use(remarkParse).use(remarkGfm).use(remarkMath)

export function parseMarkdownBlocks(raw: string, offsetBase = 0, lineBase = 0): RenderBlock[] {
  const root: Root = parser.parse(raw)
  return rootToBlocks(root, raw, offsetBase, lineBase)
}

export function parseCanonical(raw: string): RenderDocument {
  return {
    raw,
    visible: raw,
    blocks: parseMarkdownBlocks(raw),
    diagnostics: [],
    work: { parsedCodeUnits: raw.length, strategy: 'full' },
  }
}
