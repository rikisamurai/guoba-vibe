import { readFile, readdir } from 'node:fs/promises'
import path from 'node:path'

import { convertMarkdown, frontmatter, noteLink, readTitle } from './markdown.mjs'
import { relativeNote } from './paths.mjs'

async function listSources(directory, prefix = '') {
  const entries = await readdir(path.join(directory, prefix), { withFileTypes: true })
  const groups = await Promise.all(
    entries.map((entry) => {
      const file = prefix ? `${prefix}/${entry.name}` : entry.name
      if (entry.isSymbolicLink()) throw new Error(`Source symlink is not supported: ${file}`)
      if (entry.isDirectory()) return listSources(directory, file)
      return /\.mdx?$/.test(file) ? [file] : []
    }),
  )
  return groups.flat().toSorted()
}

const groupTitles = {
  '00': '开始',
  A: 'A · 读懂真实网络',
  B: 'B · 让同一个聊天可靠',
  C: 'C · 测量后再优化',
  S: '补充 · 最小模型',
}

function makeReadme(pages, order, context) {
  const { prefix, sha, date, repository } = context
  const byFile = new Map(pages.map((page) => [page.file, page]))
  const lines = [
    frontmatter({
      title: 'Streaming 课程课件',
      date,
      sha,
      source: `${repository}/tree/${sha}/apps/stream-render-course`,
    }),
    '# Streaming 课程课件',
    '',
    '> [!info] 同源同步',
    '> 课件由课程仓库生成。修改正文请回源仓库；个人笔记另建文件，不会被同步覆盖。交互实验需要本地 Course / Lab 服务。',
    '',
    `${noteLink(prefix, 'index.md', '课程概览')} · ${noteLink(prefix, 'setup.md', '安装与运行')}`,
    '',
  ]
  let previous
  for (const route of order) {
    const page = byFile.get(`learn/${route}.md`)
    if (!page) throw new Error(`Missing ordered lesson: ${route}`)
    const group = page.title.match(/^(00|[ABCS])/u)?.[1]
    if (!group) throw new Error(`Unknown course stage: ${page.title}`)
    if (previous !== group) lines.push('', `## ${groupTitles[group]}`, '')
    lines.push(`- ${noteLink(prefix, page.file, page.title)}`)
    previous = group
  }
  const references = pages.filter((page) => page.file.startsWith('reference/'))
  if (references.length)
    lines.push(
      '',
      '## 参考',
      '',
      ...references.map((page) => `- ${noteLink(prefix, page.file, page.title)}`),
    )
  lines.push(
    '',
    '## 实验入口',
    '',
    '[Mini Chat](http://localhost:5174/project?source=mine) · [网络观测](http://localhost:5174/playground?demo=network-inspector&source=mine) · [性能实验](http://localhost:5174/profiler)',
    '',
    `源版本：\`${sha}\`（${date}）。`,
    '',
  )
  return lines.join('\n')
}

export async function collectNotes(course, context) {
  const sources = await listSources(path.join(course, 'docs'))
  const pages = await Promise.all(
    sources.map(async (sourceFile) => {
      const file = relativeNote(sourceFile.replace(/\.mdx$/, '.md'))
      const [source, markdown] = await Promise.all([
        readFile(path.join(course, 'docs', sourceFile), 'utf8'),
        readFile(path.join(course, 'doc_build', file), 'utf8'),
      ])
      return { file, sourceFile, title: readTitle(source), markdown }
    }),
  )
  const routes = new Map(
    pages.flatMap(({ file }) => {
      const route = '/' + file.replace(/\.md$/, '')
      return [
        [route, file],
        [route.replace(/(^|\/)index$/, '') || '/', file],
      ]
    }),
  )
  const notes = new Map(
    pages.map((page) => {
      const source = `${context.repository}/blob/${context.sha}/apps/stream-render-course/docs/${page.sourceFile.split('/').map(encodeURIComponent).join('/')}`
      const content =
        frontmatter({ title: page.title, date: context.date, sha: context.sha, source }) +
        '\n' +
        convertMarkdown(page.markdown, routes, context.prefix)
      return [page.file, content]
    }),
  )
  if (notes.has('README.md'))
    throw new Error('Source README.md conflicts with the generated course index')
  const order = JSON.parse(await readFile(path.join(course, 'docs/learn/_meta.json'), 'utf8'))
  notes.set('README.md', makeReadme(pages, order, context))
  return notes
}
