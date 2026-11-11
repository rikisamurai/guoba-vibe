import { relativeNote } from './paths.mjs'

export function readTitle(source) {
  const header = source.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/)?.[1]
  const value = header?.match(/^title:\s*(.+)$/m)?.[1].trim()
  if (!value || /^[>|]/.test(value)) throw new Error('Expected a single-line source title')
  if (value.startsWith('"')) return JSON.parse(value)
  if (value.startsWith("'")) return value.slice(1, -1).replaceAll("''", "'")
  return value
}

export function noteLink(prefix, file, label) {
  relativeNote(file)
  const safeLabel = label.replace(/\s+/g, ' ').replaceAll('|', '｜').replaceAll(']', '］').trim()
  return `[[${prefix}/${file.slice(0, -3)}|${safeLabel}]]`
}

function transformProse(text, routes, prefix) {
  return text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (original, label, href) => {
    const target = href.trim()
    if (!target.startsWith('/')) return `[${label.replace(/\s+/g, ' ').trim()}](${target})`
    const [route, hash] = target.split('#')
    const file = routes.get(route.replace(/\.(md|html)$/, '').replace(/\/$/, '') || '/')
    if (!file) throw new Error(`Unresolved course link: ${target}`)
    if (hash) throw new Error(`Heading link needs an explicit Obsidian heading mapping: ${target}`)
    return noteLink(prefix, file, label)
  })
}

function protectInlineCode(text, transform) {
  const runs = [...text.matchAll(/`+/g)]
  let result = ''
  let consumed = 0
  for (let index = 0; index < runs.length; index++) {
    const opener = runs[index]
    if (text[opener.index - 1] === '\\') continue
    const close = runs.findIndex(
      (run, position) => position > index && run[0].length === opener[0].length,
    )
    if (close < 0) continue
    const end = runs[close].index + runs[close][0].length
    result += transform(text.slice(consumed, opener.index)) + text.slice(opener.index, end)
    consumed = end
    index = close
  }
  return result + transform(text.slice(consumed))
}

function fenceMarker(line) {
  // Conservatively preserve fences inside lists and blockquotes as well as top-level ones.
  const content = line
    .replace(/^(?:[ \t]*>[ \t]?)+/, '')
    .trimStart()
    .replace(/^(?:[-+*]|\d+[.)])\s+/, '')
  return content.match(/^(`{3,}|~{3,})(.*?)(?:\r?\n)?$/)
}

export function convertMarkdown(markdown, routes, prefix) {
  const source = markdown.replace(/^> For AI agents:[^\n]*(?:\n|$)/, '').replace(/^\n+/, '')
  let fence
  let prose = ''
  let result = ''
  const flush = () => {
    // Inline code, like fenced code, is source material rather than a course link.
    result += protectInlineCode(prose, (part) => transformProse(part, routes, prefix))
    prose = ''
  }
  for (const line of source.match(/[^\n]*\n|[^\n]+$/g) ?? []) {
    const marker = fenceMarker(line)
    if (fence) {
      result += line
      if (
        marker &&
        marker[1][0] === fence[0] &&
        marker[1].length >= fence.length &&
        !marker[2].trim()
      )
        fence = undefined
    } else if (marker) {
      flush()
      fence = marker[1]
      result += line
    } else prose += line
  }
  flush()
  return result
}

export function frontmatter({ title, date, source, sha }) {
  return [
    '---',
    `title: ${JSON.stringify(title)}`,
    `date: ${JSON.stringify(date)}`,
    'tags: [course, streaming]',
    `source: ${JSON.stringify(source)}`,
    `source_sha: ${JSON.stringify(sha)}`,
    '---',
    '',
  ].join('\n')
}
