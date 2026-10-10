import { marked } from 'marked'

import type { Block, BlockKind, SplitResult } from '../types/block'
import { scanFences } from './tail-repair'

/**
 * M2 core: split the growing text into top-level blocks with a stable prefix.
 * Frozen blocks keep their object identity across pushes, so memoized views
 * skip them entirely; only the dirty tail region is re-lexed each commit.
 *
 * Freezing is deliberately conservative — a block freezes only when
 *   1. a later block already exists,
 *   2. its raw ends with a blank line (dodges the setext trap),
 *   3. the following text does not look like an indented continuation
 *      (dodges loose lists), and
 *   4. its raw survived one full push unchanged.
 * Mistakes made mid-stream are corrected by finalize(), which re-lexes the
 * complete text and reconciles ids by matching raw prefixes.
 */
interface SplitterState {
  text: string
  blocks: Block[]
  stableCount: number
  seq: number
  finalized: boolean
  /** raws of not-yet-stable blocks from the previous push (rule 4). */
  previousDirtyRaws: string[]
}

const states = new Map<string, SplitterState>()
const MAX_TRACKED_MESSAGES = 64

function makeBlock(messageId: string, state: SplitterState, raw: string): Block {
  state.seq += 1
  const fenceMatch = /^ {0,3}(?:`{3,}|~{3,}) *(\S*)/.exec(raw)
  let kind: BlockKind = 'markdown'
  let fence: Block['fence']
  if (fenceMatch !== null) {
    const lang = fenceMatch[1]
    kind = lang === 'mermaid' ? 'mermaid' : 'code'
    fence = { lang, closed: !scanFences(raw).open }
  }
  return {
    id: `${messageId}:${state.seq}`,
    kind,
    raw,
    stable: false,
    ...(fence === undefined ? {} : { fence }),
  }
}

/** Lex a text region into contiguous raw slices (blank runs folded left). */
function lexRegion(region: string): string[] {
  const raws: string[] = []
  for (const token of marked.lexer(region)) {
    if (token.raw === '') continue
    if (token.type === 'space' && raws.length > 0) {
      raws[raws.length - 1] += token.raw
    } else {
      raws.push(token.raw)
    }
  }
  return raws
}

/**
 * Lossless partition of a region. marked sometimes normalizes token raws
 * (e.g. trailing whitespace inside lists), which would break the
 * "raws concatenate to the input" invariant — from the first mismatch on,
 * the remainder becomes one coarse dirty block instead.
 */
function partitionRegion(region: string): string[] {
  const raws: string[] = []
  let offset = 0
  for (const raw of lexRegion(region)) {
    if (!region.startsWith(raw, offset)) break
    raws.push(raw)
    offset += raw.length
  }
  if (offset < region.length) raws.push(region.slice(offset))
  return raws
}

function isContinuationSensitive(raw: string): boolean {
  return /^ {0,3}([-*+]|\d+[.)])\s/.test(raw) || raw.startsWith('>')
}

function freezeEligible(blocks: Block[], index: number, previousDirtyRaws: string[]): boolean {
  const block = blocks[index]
  const next = blocks[index + 1]
  if (next === undefined) return false
  if (!block.raw.endsWith('\n\n') && !block.raw.endsWith('\n\r\n')) return false
  if (isContinuationSensitive(block.raw) && /^ {2,}\S/.test(next.raw)) return false
  if (block.kind !== 'markdown' && block.fence?.closed !== true) return false
  return previousDirtyRaws.includes(block.raw)
}

function getState(messageId: string): SplitterState {
  let state = states.get(messageId)
  if (state === undefined) {
    state = {
      text: '',
      blocks: [],
      stableCount: 0,
      seq: 0,
      finalized: false,
      previousDirtyRaws: [],
    }
    if (states.size >= MAX_TRACKED_MESSAGES) {
      const oldest = states.keys().next().value
      if (oldest !== undefined) states.delete(oldest)
    }
    states.set(messageId, state)
  }
  return state
}

export function splitBlocks(messageId: string, text: string): SplitResult {
  const state = getState(messageId)
  if (text === state.text) {
    return { blocks: state.blocks, tailParseMs: 0, stableCount: state.stableCount }
  }

  let stablePrefixLength = 0
  for (let index = 0; index < state.stableCount; index++) {
    stablePrefixLength += state.blocks[index].raw.length
  }
  if (!text.startsWith(state.text.slice(0, stablePrefixLength))) {
    // History rewrite for this id — start over.
    state.blocks = []
    state.stableCount = 0
    state.previousDirtyRaws = []
    stablePrefixLength = 0
  }

  const started = performance.now()
  const dirtyRaws = partitionRegion(text.slice(stablePrefixLength))
  const tailParseMs = performance.now() - started

  const stableBlocks = state.blocks.slice(0, state.stableCount)
  const previousDirty = state.blocks.slice(state.stableCount)
  const dirtyBlocks = dirtyRaws.map((raw, index) => {
    const previous = previousDirty[index]
    if (previous !== undefined && previous.raw === raw) return previous
    return makeBlock(messageId, state, raw)
  })

  const blocks = [...stableBlocks, ...dirtyBlocks]
  let stableCount = state.stableCount
  while (
    stableCount < blocks.length &&
    freezeEligible(blocks, stableCount, state.previousDirtyRaws)
  ) {
    blocks[stableCount] = { ...blocks[stableCount], stable: true }
    stableCount += 1
  }

  state.text = text
  state.blocks = blocks
  state.stableCount = stableCount
  state.previousDirtyRaws = dirtyRaws
  return { blocks, tailParseMs, stableCount }
}

/** Terminal reconcile: re-lex the full text, keep ids where raws match. */
export function finalizeBlocks(messageId: string, text: string): SplitResult {
  const state = getState(messageId)
  if (state.finalized && state.text === text) {
    return { blocks: state.blocks, tailParseMs: 0, stableCount: state.stableCount }
  }
  const started = performance.now()
  const raws = partitionRegion(text)
  const tailParseMs = performance.now() - started

  const blocks: Block[] = []
  let matching = true
  for (let index = 0; index < raws.length; index++) {
    const previous = state.blocks[index]
    if (matching && previous !== undefined && previous.raw === raws[index]) {
      blocks.push(previous.stable ? previous : { ...previous, stable: true })
    } else {
      matching = false
      const block = makeBlock(messageId, state, raws[index])
      blocks.push({ ...block, stable: true })
    }
  }
  state.text = text
  state.blocks = blocks
  state.stableCount = blocks.length
  state.finalized = true
  state.previousDirtyRaws = []
  return { blocks, tailParseMs, stableCount: blocks.length }
}

export function resetBlockCache(): void {
  states.clear()
}
