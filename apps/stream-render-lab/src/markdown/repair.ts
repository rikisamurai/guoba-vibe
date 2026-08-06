import { runLength, scanRepairSyntax, unfinishedMathFence } from './repair-scanner'
import type { RepairResult, SourceRange } from './types'

function append(text: string, suffix: string, ranges: SourceRange[]): string {
  const start = text.length
  ranges.push({ start, end: start + suffix.length })
  return text + suffix
}

function isWhitespace(character: string | undefined): boolean {
  return character === undefined || /\s/u.test(character)
}

function isPunctuation(character: string | undefined): boolean {
  return character !== undefined && /[\p{P}\p{S}]/u.test(character)
}

function delimiterFlanking(
  syntax: string,
  start: number,
  end: number,
): { left: boolean; right: boolean } {
  const before = syntax[start - 1]
  const after = syntax[end]
  const left =
    !isWhitespace(after) && (!isPunctuation(after) || isWhitespace(before) || isPunctuation(before))
  const right =
    !isWhitespace(before) && (!isPunctuation(before) || isWhitespace(after) || isPunctuation(after))
  return { left, right }
}

function finalTextBlockStart(raw: string): number {
  const blankLine = /(?:^|\r\n|\r|\n)[ \t]*(?:\r\n|\r|\n)/gu
  let start = 0
  let match = blankLine.exec(raw)
  while (match) {
    start = match.index + match[0].length
    match = blankLine.exec(raw)
  }
  return start
}

function unmatchedInlineMarker(visibleSyntax: string, blockStart: number): string | undefined {
  const unmatched: Array<{ end: number; marker: string }> = []
  let cursor = blockStart
  while (cursor < visibleSyntax.length) {
    const marker = visibleSyntax[cursor]
    if (marker !== '*' && marker !== '_') {
      cursor += 1
      continue
    }
    const size = runLength(visibleSyntax, cursor, marker)
    const end = cursor + size
    if (size >= 2) {
      const runMarker = marker.repeat(2)
      const { left, right } = delimiterFlanking(visibleSyntax, cursor, end)
      const before = visibleSyntax[cursor - 1]
      const after = visibleSyntax[end]
      const canOpen = left && (marker === '*' || !right || isPunctuation(before))
      const canClose = right && (marker === '*' || !left || isPunctuation(after))
      let openerIndex = unmatched.length - 1
      while (openerIndex >= 0 && unmatched[openerIndex]?.marker !== runMarker) openerIndex -= 1
      if (canClose && openerIndex >= 0) unmatched.splice(openerIndex, 1)
      else if (size === 2 && canOpen) unmatched.push({ end, marker: runMarker })
    }
    cursor = end
  }
  if (unmatched.length !== 1) return undefined
  const opener = unmatched[0]
  return opener && /[^\s*_]/u.test(visibleSyntax.slice(opener.end)) ? opener.marker : undefined
}

export function repairPreview(raw: string): RepairResult {
  const syntheticRanges: SourceRange[] = []
  let text = raw
  const { syntax, openFence } = scanRepairSyntax(raw)
  const fence = openFence
    ? `${/[\r\n]$/.test(raw) ? '' : '\n'}${openFence.marker.repeat(openFence.size)}`
    : undefined
  if (fence) text = append(text, fence, syntheticRanges)
  const mathFence = !fence ? unfinishedMathFence(syntax) : undefined
  if (mathFence) {
    const closer = `${/[\r\n]$/.test(raw) ? '' : '\n'}${'$'.repeat(mathFence.size)}`
    text = append(text, closer, syntheticRanges)
  }
  const inline =
    !fence && !mathFence ? unmatchedInlineMarker(syntax, finalTextBlockStart(raw)) : undefined
  if (inline) text = append(text, inline, syntheticRanges)
  return { text, syntheticRanges }
}
