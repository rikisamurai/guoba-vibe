import { spawnSync } from 'node:child_process'

const [command, ...args] = process.argv.slice(2)
const groups = ['utf8', 'sse', 'provider', 'lifecycle', 'batch']
const group = args.find((arg) => arg !== '--reference')
const usage =
  'Usage: pnpm practice test [utf8|sse|provider|lifecycle|batch] [--reference]\n       pnpm practice measure'
if (
  !(command === 'test' || (command === 'measure' && args.length === 0)) ||
  args.filter((arg) => arg !== '--reference').length > 1 ||
  (group && !groups.includes(group))
) {
  console.error(usage)
  process.exit(1)
}
console.info(
  command === 'measure'
    ? '测量 src/my-chat/publish.ts：固定到达节奏与虚拟帧，对比立即发布与参考实现。'
    : args.includes('--reference')
      ? '验收独立参考实现；通过不代表学员实现已完成。'
      : '验收 src/my-chat/ 当前代码。起点有刻意保留的边界缺口；失败会给出文件与断言。',
)
const result = spawnSync(
  'pnpm',
  [
    'exec',
    'vitest',
    'run',
    '--config',
    'practice.vitest.config.ts',
    ...(command === 'measure' ? ['publish.measure', '--reporter=default'] : ['learner.practice']),
  ],
  {
    stdio: 'inherit',
    env: {
      ...process.env,
      VITE_PRACTICE_GROUP: group ?? '',
      VITE_PRACTICE_REFERENCE: args.includes('--reference') ? '1' : '0',
    },
  },
)
process.exit(result.status ?? 1)
