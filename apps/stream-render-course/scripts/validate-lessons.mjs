import { access, readFile, readdir } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('../', import.meta.url))
const docs = path.join(root, 'docs')
const lab = path.resolve(root, '../stream-render-lab')
const issues = []
const exerciseFolders = {
  '01': '01-static-chat',
  '02': '02-replay-clock',
  '03': '03-m0-baseline',
  '04': '04-utf8',
  '05': '05-sse',
  '06': '06-chat-completions',
  10: '10-m1-frame-batching',
}
async function walk(folder) {
  const entries = await readdir(folder, { withFileTypes: true })
  const files = await Promise.all(
    entries.map((entry) =>
      entry.isDirectory() ? walk(path.join(folder, entry.name)) : [path.join(folder, entry.name)],
    ),
  )
  return files.flat().filter((file) => /\.mdx?$/.test(file))
}
const files = await walk(docs)
const routes = new Set(
  files.map(
    (file) =>
      '/' +
      path
        .relative(docs, file)
        .replace(/\.mdx?$/, '')
        .replace(/(^|\/)index$/, ''),
  ),
)
const order = JSON.parse(await readFile(path.join(docs, 'learn/_meta.json'), 'utf8'))
if (order.length !== 19) issues.push('Expected orientation plus 18 linked lessons')
for (const name of order) if (!routes.has(`/learn/${name}`)) issues.push(`Missing lesson: ${name}`)
await Promise.all(
  files.map(async (file) => {
    const source = await readFile(file, 'utf8')
    const name = path.relative(docs, file)
    for (const marker of ['title:', 'description:', '# '])
      if (!source.includes(marker)) issues.push(`${name}: missing ${marker}`)
    for (const match of source.matchAll(/\]\((\/[^)#]+)(?:#[^)]*)?\)/g)) {
      const target = match[1].replace(/\.html$/, '')
      if (!routes.has(target)) issues.push(`${name}: broken link ${target}`)
    }
    for (const match of source.matchAll(/from ['"](\.[^'"]+)['"]/g)) {
      const target = path.resolve(path.dirname(file), match[1])
      // oxlint-disable-next-line no-await-in-loop -- small import checks keep diagnostics tied to the current document
    const found = await Promise.all(
        ['', '.ts', '.tsx'].map((ext) =>
          access(target + ext).then(
            () => true,
            () => false,
          ),
        ),
      )
      if (!found.some(Boolean)) issues.push(`${name}: missing import ${match[1]}`)
    }
    if (name.startsWith('learn/')) {
      if (!source.includes('pnpm ') && !name.startsWith('learn/00'))
        issues.push(`${name}: no runnable verification command`)
      if (!/第[一二三四五六]步|Step [0-9]/.test(source))
        issues.push(`${name}: no step-by-step instructions`)
      if (!source.includes('预期') && !source.includes('应'))
        issues.push(`${name}: no expected result`)
    }
  }),
)
await Promise.all(
  Object.entries(exerciseFolders).flatMap(([step, folder]) =>
    ['exercise', 'solution'].map(async (kind) => {
      const base = path.join(lab, 'workshop/mini-chat', folder, kind)
      const entries = await readdir(base)
      if (!entries.some((file) => file.endsWith('.test.ts')))
        issues.push(`${step}: missing ${kind} test`)
    }),
  ),
)
if (issues.length) {
  console.error(issues.join('\n'))
  process.exitCode = 1
} else
  console.log(
    `Validated ${files.length} documents, 19 lesson routes, local links, imports and exercise tests.`,
  )
