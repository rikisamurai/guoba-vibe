import { lstat, readFile, readdir } from 'node:fs/promises'
import { join } from 'node:path'

import type {
  Inventory,
  SkillProvenance,
  SkillRecord,
  SkillScope,
  UpdateStatus,
} from '../shared/types'
import { inspectClaudeLink } from './claude-links'
import { buildContentManifest } from './content-manifest'
import { parseSkillMetadata } from './frontmatter'
import { readLockFile } from './lock-file'
import { getScopePaths, type ManagerRoots, type ScopePaths } from './paths'

export async function scanInventory(roots: ManagerRoots): Promise<Inventory> {
  const scopes: SkillScope[] = roots.projectRoot ? ['project', 'user'] : ['user']
  const grouped = await Promise.all(scopes.map((scope) => scanScope(roots, scope)))
  return {
    projectRoot: roots.projectRoot,
    userHome: roots.userHome,
    skills: grouped.flat().toSorted(compareSkills),
    scannedAt: new Date().toISOString(),
  }
}

async function scanScope(roots: ManagerRoots, scope: SkillScope): Promise<SkillRecord[]> {
  const paths = getScopePaths(roots, scope)
  const lock = await readLockFile(paths.lockPath)
  const canonicalNames = await directoryNames(paths.canonicalRoot)
  const claudeNames = await directoryNames(paths.claudeRoot)
  const names = [...new Set([...canonicalNames, ...claudeNames])].toSorted()
  return Promise.all(names.map((name) => scanSkill(scope, paths, name, lock.skills[name])))
}

async function scanSkill(
  scope: SkillScope,
  paths: ScopePaths,
  folderName: string,
  provenance?: SkillProvenance,
): Promise<SkillRecord> {
  const canonicalPath = join(paths.canonicalRoot, folderName)
  const claudePath = join(paths.claudeRoot, folderName)
  const canonical = await isRealDirectory(canonicalPath)
  const location = canonical ? 'canonical' : 'claude_only'
  const contentPath = canonical ? canonicalPath : claudePath
  const linkStatus = await inspectClaudeLink(canonicalPath, claudePath)
  try {
    const content = await readFile(join(contentPath, 'SKILL.md'), 'utf8')
    const metadata = parseSkillMetadata(content, folderName)
    const manifest = await buildContentManifest(contentPath)
    return {
      id: `${scope}:${folderName}`,
      name: metadata.name,
      description: metadata.description,
      scope,
      location,
      canonicalPath,
      claudePath,
      linkStatus,
      updateStatus: classifyStatus(location, provenance, manifest.contentHash),
      content,
      files: manifest.entries.map((entry) => entry.path),
      provenance,
    }
  } catch (error) {
    return {
      id: `${scope}:${folderName}`,
      name: folderName,
      description: 'This Skill could not be read safely.',
      scope,
      location,
      canonicalPath,
      claudePath,
      linkStatus,
      updateStatus: 'error',
      content: '',
      files: [],
      provenance,
      error: error instanceof Error ? error.message : String(error),
    }
  }
}

function classifyStatus(
  location: SkillRecord['location'],
  provenance: SkillProvenance | undefined,
  localHash: string,
): UpdateStatus {
  if (location === 'claude_only') return 'local_only'
  if (!provenance?.sourceUrl) return 'untracked'
  const localChanged =
    provenance.hashProfile === 'guoba-skill-v1' &&
    Boolean(provenance.contentHash) &&
    localHash !== provenance.contentHash
  const remoteChanged =
    Boolean(provenance.lastChecked?.contentHash) &&
    provenance.lastChecked?.contentHash !== provenance.contentHash
  if (localChanged && remoteChanged) return 'diverged'
  if (localChanged) return 'local_modified'
  if (remoteChanged) return 'update_available'
  return 'up_to_date'
}

async function directoryNames(path: string): Promise<string[]> {
  try {
    const entries = await readdir(path, { withFileTypes: true })
    return entries.filter((entry) => !entry.name.startsWith('.')).map((entry) => entry.name)
  } catch (error) {
    if (isMissing(error)) return []
    throw error
  }
}

async function isRealDirectory(path: string): Promise<boolean> {
  try {
    const stats = await lstat(path)
    return stats.isDirectory() && !stats.isSymbolicLink()
  } catch (error) {
    if (isMissing(error)) return false
    throw error
  }
}

function compareSkills(left: SkillRecord, right: SkillRecord): number {
  if (left.scope !== right.scope) return left.scope === 'project' ? -1 : 1
  return left.name.localeCompare(right.name)
}

function isMissing(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === 'ENOENT'
}
