import { spawnSync } from 'node:child_process'
import path from 'node:path'
import process from 'node:process'

const LESSONS = {
  'quick-start': '01-quick-start',
  sse: '05-sse',
  m1: '10-m1-frame-batching',
}

const [lesson, command = 'test'] = process.argv.slice(2)
const folder = LESSONS[lesson]
if (!folder || (command !== 'test' && command !== 'solution')) {
  console.error('Usage: pnpm lesson <quick-start|sse|m1> <test|solution>')
  process.exit(2)
}

const target = `workshop/${folder}/${command === 'test' ? 'exercise' : 'solution'}/*.test.ts`
const executable = path.join(
  process.cwd(),
  'node_modules',
  '.bin',
  process.platform === 'win32' ? 'vitest.cmd' : 'vitest',
)
const result = spawnSync(executable, ['run', '--config', 'workshop/vitest.config.ts'], {
  env: { ...process.env, LESSON_TARGET: target },
  stdio: 'inherit',
})

process.exit(result.status ?? 1)
