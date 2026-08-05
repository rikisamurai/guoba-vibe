/**
 * Mini "remend": produces a render-only version of a streaming tail with
 * unfinished markdown temporarily closed. The original text is never
 * modified — callers render repair(text) while streaming and switch back to
 * the raw text at terminal phases.
 *
 * Scope (deliberately conservative):
 * - unclosed ``` / ~~~ fences → append a closing fence
 * - in the tail paragraph only (after the last blank line, outside fences):
 *   unclosed inline code, **bold**, __bold__, *emphasis*, half links
 */

interface FenceState {
  open: boolean
  char: string
  length: number
}

/** Line-based fence tracker, shared with the block splitter. */
export function scanFences(text: string): FenceState {
  const state: FenceState = { open: false, char: '`', length: 3 }
  for (const line of text.split('\n')) {
    const match = /^ {0,3}(`{3,}|~{3,})/.exec(line)
    if (match === null) continue
    const run = match[1]
    if (!state.open) {
      state.open = true
      state.char = run[0]
      state.length = run.length
    } else if (run[0] === state.char && run.length >= state.length) {
      state.open = false
    }
  }
  return state
}

/** Backtick run length left open at the end of the tail, 0 if balanced. */
function openInlineCodeRun(tail: string): number {
  let openRun = 0
  let index = 0
  while (index < tail.length) {
    if (tail[index] !== '`') {
      index += 1
      continue
    }
    let run = 0
    while (index < tail.length && tail[index] === '`') {
      run += 1
      index += 1
    }
    if (openRun === 0) {
      openRun = run
    } else if (run >= openRun) {
      openRun = 0
    }
  }
  return openRun
}

/** Strip inline code spans so emphasis counting ignores their contents. */
function withoutInlineCode(tail: string): string {
  return tail.replaceAll(/`+[^`]*`+/g, ' ')
}

function countOccurrences(text: string, marker: string): number {
  let count = 0
  let from = 0
  for (;;) {
    const at = text.indexOf(marker, from)
    if (at === -1) return count
    count += 1
    from = at + marker.length
  }
}

/** Single * that is neither part of ** nor a list bullet at line start. */
function countSingleStars(text: string): number {
  let count = 0
  for (let index = 0; index < text.length; index++) {
    if (text[index] !== '*') continue
    if (text[index - 1] === '*' || text[index + 1] === '*') continue
    const lineStart = text.lastIndexOf('\n', index - 1) + 1
    const isBullet = text.slice(lineStart, index).trim() === '' && text[index + 1] === ' '
    if (!isBullet) count += 1
  }
  return count
}

export function repairTail(text: string): string {
  if (text === '') return text

  const fence = scanFences(text)
  if (fence.open) {
    // Inside a fence nothing is markdown; closing it is the only repair.
    return `${text}\n${fence.char.repeat(fence.length)}`
  }

  const lastBlank = text.lastIndexOf('\n\n')
  const tail = lastBlank === -1 ? text : text.slice(lastBlank + 2)
  let repaired = text

  const codeRun = openInlineCodeRun(tail)
  if (codeRun > 0) repaired += '`'.repeat(codeRun)

  const prose = withoutInlineCode(tail)
  if (/\]\([^)\s]*$/.test(prose)) repaired += ')'
  else if (/\[[^\]()]*$/.test(prose)) repaired += ']'

  if (countOccurrences(prose, '**') % 2 === 1) repaired += '**'
  if (countOccurrences(prose, '__') % 2 === 1) repaired += '__'
  if (countSingleStars(prose) % 2 === 1) repaired += '*'

  return repaired
}
