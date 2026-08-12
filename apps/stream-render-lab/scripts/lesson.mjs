import { spawnSync } from 'node:child_process'
import path from 'node:path'
import process from 'node:process'

const LESSONS = {
  '00': '00-quick-start',
  '01': '01-static-chat',
  '02': '02-replay-clock',
  '03': '03-m0-baseline',
  '04': '04-utf8',
  '05': '05-sse',
  '06': '06-chat-completions',
  10: '10-m1-frame-batching',
}

const [lesson, command = 'test'] = process.argv.slice(2)
const folder = LESSONS[lesson]
if (!folder || (command !== 'test' && command !== 'solution')) {
  console.error('Usage: pnpm lesson <00|01|02|03|04|05|06|10> <test|solution>')
  process.exit(2)
}

const target = `workshop/mini-chat/${folder}/${command === 'test' ? 'exercise' : 'solution'}/*.test.ts`
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
