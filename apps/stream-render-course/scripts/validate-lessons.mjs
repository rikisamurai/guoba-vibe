import { access, readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'

const courseRoot = new URL('../', import.meta.url)
const labRoot = new URL('../stream-render-lab/', courseRoot)
const root = fileURLToPath(courseRoot)

const lessons = [
  lesson('01', '01-non-streaming-chat.mdx', '01-static-chat', 'index.tsx', [
    '完整 assistant reply',
    'complete-response',
  ]),
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
    ['arrival clock', 'display clock', 'pending frame', 'drain', 'cancel'],
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
  validateDepth(item.file, source, failures)
}

if (failures.length > 0) {
  console.error(
    `Lesson validation failed in ${root}:\n${failures.map((item) => `- ${item}`).join('\n')}`,
  )
  process.exitCode = 1
} else {
  console.log('Validated orientation, 6 path lessons, and the M1 golden preview.')
}

function lesson(step, file, folder, sourceFile, unique, extraFiles = []) {
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
    'Node',
    'pnpm dev:stream-render',
    'http://localhost:5173',
    'http://localhost:5174',
    'pnpm-workspace.yaml',
    'byte',
    'SSE event',
    'demoId="quick-start"',
    'arrival clock',
    'display clock',
    'raw',
    'visible',
    'lesson 00 test',
    'lesson 00 solution',
    'VirtualClock',
    'ReplaySource',
    'run-comparison.ts',
    'Checkpoint',
    '常见错误',
  ]
  for (const marker of markers) {
    if (!source.includes(marker)) issues.push(`${file}: missing ${marker}`)
  }
  const workshopFiles = [
    'workshop/mini-chat/00-quick-start/contract.ts',
    'workshop/mini-chat/00-quick-start/fixture.ts',
    'workshop/mini-chat/00-quick-start/run-profile.ts',
    'workshop/mini-chat/00-quick-start/exercise/run-comparison.ts',
    'workshop/mini-chat/00-quick-start/solution/run-comparison.ts',
  ]
  for (const reference of workshopFiles) {
    try {
      // oxlint-disable-next-line no-await-in-loop -- references are few and errors stay ordered
      await access(new URL(reference, labRoot))
    } catch {
      issues.push(`${file}: missing workshop file ${reference}`)
    }
  }
  validateDepth(file, source, issues)
}

function validateDepth(file, source, issues) {
  const headingCount = source.match(/^##? /gm)?.length ?? 0
  const codeFenceCount = (source.match(/^```/gm)?.length ?? 0) / 2
  if (source.length < 2_500) issues.push(`${file}: content is too shallow`)
  if (headingCount < 10) issues.push(`${file}: expected at least 10 headings`)
  if (codeFenceCount < 8) issues.push(`${file}: expected at least 8 code examples`)
}
