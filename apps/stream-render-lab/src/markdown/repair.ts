import type { RepairResult, SourceRange } from './types'

function append(text: string, suffix: string, ranges: SourceRange[]): string {
  const start = text.length
  ranges.push({ start, end: start + suffix.length })
  return text + suffix
}

interface Fence {
  marker: string
  size: number
}

interface FenceCandidate extends Fence {
  rest: string
}

function runLength(raw: string, start: number, marker: string): number {
  let end = start
  while (raw[end] === marker) end += 1
  return end - start
}

function closingCodeSpan(raw: string, start: number, size: number): number | undefined {
  let cursor = start
  while (cursor < raw.length) {
    if (raw[cursor] !== '`') {
      cursor += 1
      continue
    }
    const candidateSize = runLength(raw, cursor, '`')
    if (candidateSize === size) return cursor + size
    cursor += candidateSize
  }
  return undefined
}

function fenceCandidate(line: string): FenceCandidate | undefined {
  const match = /^ {0,3}(`{3,}|~{3,})(.*)$/.exec(line)
  const run = match?.[1]
  const marker = run?.[0]
  if (!run || !marker) return undefined
  return { marker, size: run.length, rest: match[2] ?? '' }
}

function isOpeningFence(candidate: FenceCandidate): boolean {
  return candidate.marker !== '`' || !candidate.rest.includes('`')
}

function isClosingFence(candidate: FenceCandidate, open: Fence): boolean {
  return (
    candidate.marker === open.marker &&
    candidate.size >= open.size &&
    /^[ \t]*$/.test(candidate.rest)
  )
}

function maskFencedCode(raw: string): { characters: string[]; open?: Fence } {
  const characters = raw.split('')
  let open: Fence | undefined
  let lineStart = 0
  while (lineStart < raw.length) {
    let lineEnd = lineStart
    while (lineEnd < raw.length && raw[lineEnd] !== '\r' && raw[lineEnd] !== '\n') lineEnd += 1
    const candidate = fenceCandidate(raw.slice(lineStart, lineEnd))
    let codeLine = open !== undefined
    if (open && candidate && isClosingFence(candidate, open)) open = undefined
    else if (!open && candidate && isOpeningFence(candidate)) {
      open = { marker: candidate.marker, size: candidate.size }
      codeLine = true
    }
    if (codeLine) {
      for (let index = lineStart; index < lineEnd; index += 1) characters[index] = ' '
    }
    if (raw[lineEnd] === '\r' && raw[lineEnd + 1] === '\n') lineStart = lineEnd + 2
    else lineStart = lineEnd + 1
  }
  return { characters, open }
}

function maskInlineCode(characters: string[]): void {
  const syntax = characters.join('')
  let cursor = 0
  while (cursor < syntax.length) {
    if (syntax[cursor] === '\\' && cursor + 1 < syntax.length) {
      characters[cursor] = ' '
      characters[cursor + 1] = ' '
      cursor += 2
      continue
    }
    if (syntax[cursor] === '`') {
      const size = runLength(syntax, cursor, '`')
      const closing = closingCodeSpan(syntax, cursor + size, size)
      if (closing !== undefined) {
        for (let index = cursor; index < closing; index += 1) characters[index] = ' '
        cursor = closing
        continue
      }
    }
    cursor += 1
  }
}

function scanRepairSyntax(raw: string): { syntax: string; openFence?: Fence } {
  const { characters, open } = maskFencedCode(raw)
  maskInlineCode(characters)
  return { syntax: characters.join(''), openFence: open }
}

function unfinishedMathFence(syntax: string): Fence | undefined {
  let open: Fence | undefined
  for (const line of syntax.split(/\r\n|\r|\n/u)) {
    const match = /^ {0,3}(\${2,})([^$]*)$/u.exec(line)
    const run = match?.[1]
    if (!run) continue
    const candidate = { marker: '$', size: run.length, rest: match[2] ?? '' }
    if (open && isClosingFence(candidate, open)) open = undefined
    else if (!open) open = { marker: '$', size: run.length }
  }
  return open
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
