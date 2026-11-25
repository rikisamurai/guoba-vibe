import { execFileSync } from 'node:child_process'
import path from 'node:path'

const relevant = [
  'apps/stream-render-course',
  'apps/stream-render-lab',
  'packages/stream-render-contract',
  'package.json',
  'pnpm-lock.yaml',
  'pnpm-workspace.yaml',
  'scripts/dev-stream-render.mjs',
]

export function sourceVersion(course) {
  const git = (...args) => execFileSync('git', args, { cwd: course, encoding: 'utf8' }).trim()
  const repositoryRoot = git('rev-parse', '--show-toplevel')
  if (
    path.relative(repositoryRoot, course).split(path.sep).join('/') !== 'apps/stream-render-course'
  )
    throw new Error('Run this exporter from the course repository')
  const dirty = execFileSync(
    'git',
    ['status', '--porcelain', '--untracked-files=all', '--', ...relevant],
    {
      cwd: repositoryRoot,
      encoding: 'utf8',
    },
  ).trim()
  if (dirty)
    throw new Error(
      'Course-related working tree is dirty. Commit the source before syncing; no wiki files written.',
    )
  const sha = git('rev-parse', 'HEAD')
  const date = git('show', '-s', '--format=%cI', 'HEAD').slice(0, 10)
  const remote = git('remote', 'get-url', 'origin')
    .replace(/^git@github\.com:/, 'https://github.com/')
    .replace(/\.git$/, '')
  const url = new URL(remote)
  if (url.hostname !== 'github.com' || !/^\/[\w.-]+\/[\w.-]+\/?$/.test(url.pathname))
    throw new Error('Expected a GitHub repository origin for source links')
  return { sha, date, repository: `https://github.com${url.pathname.replace(/\/$/, '')}` }
}
