import { execFile } from 'node:child_process'
import { mkdir, readdir, readFile, rm } from 'node:fs/promises'
import { dirname, join, relative, resolve, sep } from 'node:path'
import { promisify } from 'node:util'

import { parseSkillMetadata } from './frontmatter'
import type { ResolvedSourceInput } from './source'

const execFileAsync = promisify(execFile)
const IGNORED_DIRECTORIES = new Set(['.git', 'node_modules', 'vendor'])

export interface RemoteRevision {
  revision: string
  branch: string | null
  fetchRef: string
}

export async function resolveRevision(source: ResolvedSourceInput): Promise<RemoteRevision> {
  if (source.requestedRef) return resolveExplicitRef(source.sourceUrl, source.requestedRef)
  const output = await git(['ls-remote', '--symref', source.sourceUrl, 'HEAD'])
  const branch = /^ref:\s+refs\/heads\/(.+)\s+HEAD$/mu.exec(output)?.[1]
  const revision = /^([0-9a-f]{40,64})\s+HEAD$/mu.exec(output)?.[1]
  if (!branch || !revision) throw new Error('Could not resolve the source default branch.')
  return { revision, branch, fetchRef: `refs/heads/${branch}` }
}

export async function materializeRevision(
  sourceUrl: string,
  remote: RemoteRevision,
  destination: string,
): Promise<void> {
  await rm(destination, { force: true, recursive: true })
  await mkdir(destination, { recursive: true })
  await git(['init', '--quiet', destination])
  await git(['-C', destination, 'remote', 'add', 'origin', sourceUrl])
  await git(['-C', destination, 'fetch', '--quiet', '--depth', '1', 'origin', remote.fetchRef])
  await git(['-C', destination, 'checkout', '--quiet', '--detach', remote.revision])
  const actual = (await git(['-C', destination, 'rev-parse', 'HEAD'])).trim()
  if (actual !== remote.revision)
    throw new Error('Fetched source did not match the prepared revision.')
}

export async function findSkillDirectory(
  repository: string,
  requestedSkill?: string,
  requestedSubpath?: string,
): Promise<string> {
  if (requestedSubpath) {
    const exact = resolve(repository, requestedSubpath)
    ensureInside(repository, exact)
    await readFile(join(exact, 'SKILL.md'))
    return exact
  }
  const candidates = await findSkillFiles(repository)
  if (candidates.length === 0) throw new Error('No SKILL.md was found in the source repository.')
  if (!requestedSkill && candidates.length === 1) return dirname(candidates[0])
  const matches = await Promise.all(
    candidates.map(async (path) => {
      const folder = dirname(path)
      const metadata = parseSkillMetadata(
        await readFile(path, 'utf8'),
        folder.split(sep).at(-1) ?? '',
      )
      return requestedSkill === metadata.name || requestedSkill === folder.split(sep).at(-1)
        ? folder
        : undefined
    }),
  )
  const match = matches.find(Boolean)
  if (match) return match
  throw new Error(`Could not uniquely find Skill “${requestedSkill ?? ''}” in the source.`)
}

export async function getTreeHash(repository: string, skillDirectory: string): Promise<string> {
  const subpath = relative(repository, skillDirectory).split(sep).join('/')
  const expression = subpath ? `HEAD:${subpath}` : 'HEAD^{tree}'
  return `git-tree:${(await git(['-C', repository, 'rev-parse', expression])).trim()}`
}

export async function git(args: string[], cwd?: string): Promise<string> {
  try {
    const { stdout } = await execFileAsync('git', args, {
      cwd,
      encoding: 'utf8',
      env: { ...process.env, GIT_TERMINAL_PROMPT: '0' },
      maxBuffer: 10 * 1024 * 1024,
    })
    return stdout
  } catch (error) {
    const detail = redact(
      typeof error === 'object' && error !== null && 'stderr' in error ? String(error.stderr) : '',
    )
    if (
      /authentication|permission denied|could not read Username|repository not found/iu.test(detail)
    ) {
      throw new Error('Git authentication is required. Configure SSH or your credential helper.', {
        cause: error,
      })
    }
    throw new Error(detail.trim() || (error instanceof Error ? error.message : String(error)), {
      cause: error,
    })
  }
}

async function resolveExplicitRef(sourceUrl: string, ref: string): Promise<RemoteRevision> {
  const output = await git([
    'ls-remote',
    sourceUrl,
    `refs/heads/${ref}`,
    `refs/tags/${ref}^{}`,
    `refs/tags/${ref}`,
  ])
  const lines = output.trim().split('\n').filter(Boolean)
  const branchLine = lines.find((line) => line.endsWith(`refs/heads/${ref}`))
  const peeledTag = lines.find((line) => line.endsWith(`refs/tags/${ref}^{}`))
  const tagLine = lines.find((line) => line.endsWith(`refs/tags/${ref}`))
  const revision = (branchLine ?? peeledTag ?? tagLine)?.split(/\s+/u)[0]
  if (!revision) throw new Error(`Git ref “${ref}” does not exist.`)
  const branch = branchLine ? ref : null
  return { revision, branch, fetchRef: branch ? `refs/heads/${ref}` : `refs/tags/${ref}` }
}

function redact(value: string): string {
  return value.replace(/(https?:\/\/)[^\s/@]+@/gu, '$1<credentials>@')
}

async function findSkillFiles(root: string): Promise<string[]> {
  const result: string[] = []
  async function visit(directory: string): Promise<void> {
    const entries = await readdir(directory, { withFileTypes: true })
    await Promise.all(
      entries.map(async (entry) => {
        if (entry.isSymbolicLink()) return
        const path = join(directory, entry.name)
        if (entry.isFile() && entry.name === 'SKILL.md') result.push(path)
        if (entry.isDirectory() && !IGNORED_DIRECTORIES.has(entry.name)) await visit(path)
      }),
    )
  }
  await visit(root)
  return result.toSorted()
}

function ensureInside(root: string, child: string): void {
  const path = relative(resolve(root), resolve(child))
  if (path.startsWith('..') || path === '')
    throw new Error('Skill path must stay inside the source repository.')
}
