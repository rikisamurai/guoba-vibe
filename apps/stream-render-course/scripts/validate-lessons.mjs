import { access, readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'

const courseRoot = new URL('../', import.meta.url)
const labRoot = new URL('../stream-render-lab/', courseRoot)
const root = fileURLToPath(courseRoot)

const lessons = [
  lesson(
    '01',
    '01-non-streaming-chat.mdx',
    '01-static-chat',
    'index.tsx',
    [
      'sendNonStreamingTurn',
      'complete(prompt)',
      'Promise<string>',
      'idle',
      'waiting',
      'completed',
      'user → assistant',
      "publish({ phase: 'waiting'",
      'const reply = await complete(prompt)',
      "phase: 'completed'",
      'assistant 文本逐字等于',
    ],
    [],
    ['mini-chat.tsx'],
  ),
  lesson('02', '02-string-replay-clock.mdx', '02-replay-clock', 'index.tsx', [
    'VirtualClock',
    'advanceBy',
  ]),
  lesson('03', '03-m0-raw-visible.mdx', '03-m0-baseline', 'index.tsx', [
    'raw',
    'visible',
    'parseCount',
  ]),
  lesson('04', '04-utf8.mdx', '04-utf8', 'index.tsx', [
    'Uint8Array',
    'TextDecoder',
    'stream: true',
  ]),
  lesson('05', '05-sse.mdx', '05-sse', 'index.tsx', ['CRLF', 'data', 'EOF'], ['sse.ts']),
  lesson(
    '06',
    '06-chat-completions.mdx',
    '06-chat-completions',
    'index.tsx',
    ['reasoning_content', '[DONE]', 'finish_reason'],
    ['sse.ts', 'chat-completions.ts'],
  ),
  lesson(
    '10',
    '10-m1-frame-batching.mdx',
    '10-m1-frame-batching',
    'frame-batcher.ts',
    ['文本增量到达时间线', '显示更新时间线', 'pending frame', 'drain', 'cancel'],
    ['index.tsx', 'sse.ts', 'chat-completions.ts'],
  ),
]

const shared = [
  'title:',
  'description:',
  'import { LessonDemo }',
  'import { LessonMeta }',
  '<LessonMeta',
  '<LessonDemo',
  '新增',
  'Solution diff',
  'Checkpoint',
  '常见错误',
  '下一步',
  '面试时怎么讲',
]

const failures = []
await validateOrientation(failures)

for (const item of lessons) {
  // oxlint-disable-next-line no-await-in-loop -- ordered failures are easier for learners to act on
  const source = await readFile(new URL(`docs/learn/${item.file}`, courseRoot), 'utf8')
  const required = [
    ...shared,
    `lesson ${item.step} test`,
    `lesson ${item.step} solution`,
    ...item.unique,
  ]
  for (const marker of required) {
    if (!source.includes(marker)) failures.push(`${item.file}: missing ${marker}`)
  }
  for (const reference of item.references) {
    try {
      // oxlint-disable-next-line no-await-in-loop -- references are few and errors stay ordered
      await access(new URL(reference, labRoot))
    } catch {
      failures.push(`${item.file}: missing workshop file ${reference}`)
    }
  }
  if (item.step === '01' && source.includes('createStaticChat')) {
    failures.push(`${item.file}: still teaches the removed synchronous exercise`)
  }
  validateDepth(item.file, source, failures)
}

if (failures.length > 0) {
  console.error(
    `Lesson validation failed in ${root}:\n${failures.map((item) => `- ${item}`).join('\n')}`,
  )
  process.exitCode = 1
} else {
  console.log('Validated the Quick Start observation, 6 path lessons, and the M1 preview.')
}

function lesson(step, file, folder, sourceFile, unique, extraFiles = [], rootFiles = []) {
  const base = `workshop/mini-chat/${folder}`
  return {
    file,
    step,
    unique,
    references: [
      `${base}/contract.ts`,
      `${base}/fixture.ts`,
      `${base}/exercise/${sourceFile}`,
      `${base}/solution/${sourceFile}`,
      ...rootFiles.map((rootFile) => `${base}/${rootFile}`),
      ...extraFiles.flatMap((extraFile) => [
        `${base}/exercise/${extraFile}`,
        `${base}/solution/${extraFile}`,
      ]),
    ],
  }
}

async function validateOrientation(issues) {
  const file = 'docs/learn/00-quick-start.mdx'
  const source = await readFile(new URL(file, courseRoot), 'utf8')
  const markers = [
    'node --version',
    'pnpm dev:stream-render',
    'http://localhost:5173',
    'http://localhost:5174',
    '浏览器读到一次数据，不等于模型新增一次文本，也不等于界面产生一次显示文本状态更新',
    'https://streams.spec.whatwg.org/#model',
    'WHATWG Streams 标准',
    'ReadableStream',
    'chunk',
    'https://html.spec.whatwg.org/multipage/server-sent-events.html#parsing-an-event-stream',
    'SSE event',
    'choices[].delta.content',
    'DeepSeek Chat Completions API',
    '本项目概念',
    '显示文本状态更新',
    '不等于 React 已提交 DOM 更新',
    'TCP segment（TCP 报文段）',
    '逐增量更新（M0）',
    '合并更新（M4）',
    'demoId="quick-start"',
    'raw',
    'visible',
    '观察一：读到 chunk，不代表正文立刻增加',
    '观察二：已接收文本可以领先当前显示文本',
    '观察三：先核对内容，再比较状态更新次数',
    '读取下一个 chunk',
    '显示已接收文本',
    '继续到完整回复',
    '本章没有证明什么',
  ]
  for (const marker of markers) {
    if (!source.includes(marker)) issues.push(`${file}: missing ${marker}`)
  }
  const forbidden = [
    'lesson 00 test',
    'lesson 00 solution',
    'run-comparison.ts',
    'runComparison',
    'VirtualClock',
    'ReplaySource',
    'Render IR',
    'direct reveal',
    '## 找到唯一 TODO',
    '## Solution diff',
    'wire chunk',
    'Engine publish',
    'Stream chunk',
    'Content delta',
    '可见更新',
    'TCP packet',
    'Provider 文本 delta',
    'SSE parser',
    'DeepSeek adapter',
  ]
  for (const marker of forbidden) {
    if (source.includes(marker)) issues.push(`${file}: should not teach ${marker}`)
  }
  validateDepth(file, source, issues)
}

function validateDepth(file, source, issues) {
  const headingCount = source.match(/^##? /gm)?.length ?? 0
  if (source.length < 2_500) issues.push(`${file}: content is too shallow`)
  if (headingCount < 10) issues.push(`${file}: expected at least 10 headings`)
}
