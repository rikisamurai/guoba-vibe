import { cp, lstat, mkdir, readlink, rename, rm, symlink } from 'node:fs/promises'
import { dirname, join, relative, resolve } from 'node:path'

import type { ClaudeLinkStatus } from '../shared/types'
import { buildContentManifest } from './content-manifest'
import { isMissingPathError } from './fs-errors'
import type { ScopePaths } from './paths'

export async function inspectClaudeLink(
  canonicalPath: string,
  claudePath: string,
): Promise<ClaudeLinkStatus> {
  const canonicalExists = await exists(canonicalPath)
  let stats
  try {
    stats = await lstat(claudePath)
  } catch (error) {
    if (isMissingPathError(error)) return canonicalExists ? 'missing' : 'claude_only'
    throw error
  }
  if (!stats.isSymbolicLink()) return canonicalExists ? 'real_directory' : 'claude_only'
  const target = resolve(dirname(claudePath), await readlink(claudePath))
  return target === resolve(canonicalPath) && canonicalExists ? 'healthy' : 'wrong_target'
}

export async function ensureClaudeLink(paths: ScopePaths, name: string): Promise<void> {
  const canonicalPath = join(paths.canonicalRoot, name)
  const claudePath = join(paths.claudeRoot, name)
  if (!(await exists(canonicalPath))) throw new Error(`Canonical Skill “${name}” does not exist.`)
  const status = await inspectClaudeLink(canonicalPath, claudePath)
  if (status === 'healthy') return
  if (status !== 'missing' && status !== 'claude_only') {
    throw new Error(
      `Claude path for “${name}” is ${status.replace('_', ' ')}; it was not overwritten.`,
    )
  }
  if (await exists(claudePath, true)) {
    throw new Error(
      `Claude path for “${name}” already contains real content; it was not overwritten.`,
    )
  }
  await mkdir(paths.claudeRoot, { recursive: true })
  await symlink(relative(paths.claudeRoot, canonicalPath), claudePath, 'dir')
}

export async function makeClaudeSkillCanonical(paths: ScopePaths, name: string): Promise<void> {
  const canonicalPath = join(paths.canonicalRoot, name)
  const claudePath = join(paths.claudeRoot, name)
  if (await exists(canonicalPath)) throw new Error(`Canonical Skill “${name}” already exists.`)
  const stats = await lstat(claudePath)
  if (!stats.isDirectory() || stats.isSymbolicLink()) {
    throw new Error('Only a real Claude Skill directory can be made canonical.')
  }
  await buildContentManifest(claudePath)
  await mkdir(paths.canonicalRoot, { recursive: true })
  const staged = join(paths.canonicalRoot, `.${name}.stage-${Date.now()}`)
  const backup = `${claudePath}.backup-${Date.now()}`
  await cp(claudePath, staged, { recursive: true, errorOnExist: true })
  await rename(claudePath, backup)
  try {
    await rename(staged, canonicalPath)
    await symlink(relative(paths.claudeRoot, canonicalPath), claudePath, 'dir')
    await rm(backup, { recursive: true })
  } catch (error) {
    await rm(claudePath, { force: true, recursive: true })
    await rm(canonicalPath, { force: true, recursive: true })
    await rm(staged, { force: true, recursive: true })
    await rename(backup, claudePath)
    throw error
  }
}

export async function removeManagedClaudeLink(paths: ScopePaths, name: string): Promise<void> {
  const canonicalPath = join(paths.canonicalRoot, name)
  const claudePath = join(paths.claudeRoot, name)
  try {
    const stats = await lstat(claudePath)
    if (!stats.isSymbolicLink()) return
    const target = resolve(dirname(claudePath), await readlink(claudePath))
    if (target === resolve(canonicalPath)) await rm(claudePath)
  } catch (error) {
    if (!isMissingPathError(error)) throw error
  }
}

async function exists(path: string, link = false): Promise<boolean> {
  try {
    await lstat(path)
    return true
  } catch (error) {
    if (isMissingPathError(error)) return false
    if (link) throw error
    throw error
  }
}
