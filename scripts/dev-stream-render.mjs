import { spawn } from 'node:child_process'
import net from 'node:net'
import process from 'node:process'

const coursePort = Number(process.env.STREAM_RENDER_COURSE_PORT ?? 5173)
const labPort = Number(process.env.STREAM_RENDER_LAB_PORT ?? 5174)
const ports = [
  ['Course', coursePort],
  ['Lab', labPort],
]

const occupied = []
for (const [label, port] of ports) {
  if (!(await isAvailable(port))) occupied.push(`${label} :${port}`)
}

if (occupied.length > 0) {
  console.error(`Streaming Render 端口已被占用：${occupied.join('、')}`)
  console.error('请停止旧 dev server，确认浏览器不再指向旧 worktree 后重新启动。')
  process.exit(1)
}

const child = spawn(
  process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm',
  ['--parallel', '--filter', 'stream-render-course', '--filter', 'stream-render-lab', 'run', 'dev'],
  {
    env: {
      ...process.env,
      PUBLIC_LAB_ORIGIN: process.env.PUBLIC_LAB_ORIGIN ?? `http://localhost:${labPort}`,
      STREAM_RENDER_COURSE_PORT: String(coursePort),
      STREAM_RENDER_LAB_PORT: String(labPort),
      VITE_COURSE_ORIGIN: process.env.VITE_COURSE_ORIGIN ?? `http://localhost:${coursePort}`,
    },
    stdio: 'inherit',
  },
)

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.once(signal, () => child.kill(signal))
}

child.once('error', (error) => {
  console.error(`无法启动 Streaming Render：${error.message}`)
  process.exitCode = 1
})

child.once('exit', (code) => {
  process.exitCode = code ?? 1
})

function isAvailable(port) {
  return new Promise((resolve) => {
    const server = net.createServer()
    server.unref()
    server.once('error', () => resolve(false))
    server.listen({ host: '0.0.0.0', port }, () => server.close(() => resolve(true)))
  })
}
