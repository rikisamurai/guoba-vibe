import { access, readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'

const courseRoot = new URL('../', import.meta.url)
const labRoot = new URL('../stream-render-lab/', courseRoot)
const root = fileURLToPath(courseRoot)

const lessons = [
  {
    file: 'docs/learn/01-quick-start.mdx',
    exerciseCommand: 'lesson quick-start test',
    solutionCommand: 'lesson quick-start solution',
    references: [
      'workshop/01-quick-start/exercise/run-comparison.ts',
      'workshop/01-quick-start/solution/run-comparison.ts',
      'workshop/01-quick-start/contract.ts',
      'workshop/shared/settle-runs.ts',
    ],
    unique: ['raw', 'visible', 'arrival clock', 'production'],
  },
  {
    file: 'docs/learn/05-sse.mdx',
    exerciseCommand: 'lesson sse test',
    solutionCommand: 'lesson sse solution',
    references: [
      'workshop/05-sse/exercise/parse-sse.ts',
      'workshop/05-sse/solution/parse-sse.ts',
      'workshop/05-sse/fixtures/chat-completions.ts',
      'workshop/05-sse/contract.ts',
    ],
    unique: ['Uint8Array', 'TextDecoder', 'CRLF', 'EOF'],
  },
  {
    file: 'docs/learn/10-m1-frame-batching.mdx',
    exerciseCommand: 'lesson m1 test',
    solutionCommand: 'lesson m1 solution',
    references: [
      'workshop/10-m1-frame-batching/exercise/frame-batcher.ts',
      'workshop/10-m1-frame-batching/solution/frame-batcher.ts',
      'workshop/10-m1-frame-batching/contract.ts',
      'workshop/shared/mini-chat.ts',
      'workshop/05-sse/fixtures/mini-chat.ts',
      'workshop/05-sse/solution/parse-sse.ts',
    ],
    unique: ['VirtualClock', 'draining', 'advanceFrame', 'pendingCount'],
  },
]

const shared = [
  'title:',
  'description:',
  'import { LessonDemo }',
  'import { LessonMeta }',
  '<LessonMeta',
  '<LessonDemo',
  'TODO 1',
  'solution',
  'Invariant',
  'Trade-off',
  '退化',
  '挑战题',
  '面试时怎么讲',
]

const failures = []
const loadedLessons = await Promise.all(
  lessons.map(async (lesson) => ({
    lesson,
    source: await readFile(new URL(lesson.file, courseRoot), 'utf8'),
  })),
)

for (const { lesson, source } of loadedLessons) {
  const required = [
    ...shared,
    lesson.exerciseCommand,
    lesson.solutionCommand,
    ...lesson.references,
    ...lesson.unique,
  ]
  for (const marker of required) {
    if (!source.includes(marker)) failures.push(`${lesson.file}: missing ${marker}`)
  }

  for (const reference of lesson.references) {
    try {
      // oxlint-disable-next-line no-await-in-loop -- references are few and errors stay ordered
      await access(new URL(reference, labRoot))
    } catch {
      failures.push(`${lesson.file}: referenced workshop file does not exist: ${reference}`)
    }
  }

  const headingCount = source.match(/^##? /gm)?.length ?? 0
  const codeFenceCount = (source.match(/^```/gm)?.length ?? 0) / 2
  if (source.length < 6_000) failures.push(`${lesson.file}: content is too shallow`)
  if (headingCount < 10) failures.push(`${lesson.file}: expected at least 10 headings`)
  if (codeFenceCount < 8) failures.push(`${lesson.file}: expected at least 8 code examples`)
}

if (failures.length > 0) {
  console.error(
    `Lesson validation failed in ${root}:\n${failures.map((item) => `- ${item}`).join('\n')}`,
  )
  process.exitCode = 1
} else {
  console.log(`Validated ${lessons.length} golden lessons with runnable workshop references.`)
}
