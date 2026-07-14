import { lstat } from 'node:fs/promises'
import { isAbsolute, join, relative, resolve, sep } from 'node:path'

import type { SkillScope } from '../shared/types'
import { getScopePaths, type ManagerRoots, type ScopePaths } from './paths'

export async function getSafeScopePaths(
  roots: ManagerRoots,
  scope: SkillScope,
): Promise<ScopePaths> {
  const paths = getScopePaths(roots, scope)
  const boundary = scope === 'project' ? roots.projectRoot : roots.userHome
  if (!boundary) throw new Error('Open a project before using Project Skills.')
  await Promise.all(
    [paths.canonicalRoot, paths.claudeRoot, paths.lockPath].map((path) =>
      rejectNestedSymlinks(boundary, path),
    ),
  )
  return paths
}

async function rejectNestedSymlinks(boundary: string, target: string): Promise<void> {
  const root = resolve(boundary)
  const child = relative(root, resolve(target))
  if (!child || child.startsWith('..') || isAbsolute(child)) {
    throw new Error(`Managed path must stay inside its ${root} scope.`)
  }
  const segments = child.split(sep)
  const paths = segments.map((_, index) => join(root, ...segments.slice(0, index + 1)))
  await Promise.all(paths.map(rejectSymlink))
}

async function rejectSymlink(path: string): Promise<void> {
  try {
    const stats = await lstat(path)
    if (stats.isSymbolicLink()) {
      throw new Error(`Managed path contains a symbolic-link ancestor: ${path}`)
    }
  } catch (error) {
    if (!isMissing(error)) throw error
  }
}

function isMissing(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === 'ENOENT'
}
