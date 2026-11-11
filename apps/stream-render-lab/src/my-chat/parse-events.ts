import type { EventParser } from '../practice/types'

// A3: This LF-only starter needs CRLF, comments and multiline data handling.
export function createEventParser(): EventParser {
  let pending = ''
  return {
    push(text) {
      pending += text
      const blocks = pending.split('\n\n')
      pending = blocks.pop() ?? ''
      return blocks.map((block) => block.replace(/^data: ?/, ''))
    },
    finish: () => [],
  }
}
