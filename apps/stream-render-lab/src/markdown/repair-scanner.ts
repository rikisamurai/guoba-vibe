interface Fence {
  marker: string
  size: number
}

interface FenceCandidate extends Fence {
  rest: string
}

export function runLength(raw: string, start: number, marker: string): number {
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

export function scanRepairSyntax(raw: string): { syntax: string; openFence?: Fence } {
  const { characters, open } = maskFencedCode(raw)
  maskInlineCode(characters)
  return { syntax: characters.join(''), openFence: open }
}

export function unfinishedMathFence(syntax: string): Fence | undefined {
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
