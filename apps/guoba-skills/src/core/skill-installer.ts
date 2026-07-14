import { lstat, mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { basename, join, relative, sep } from 'node:path'

import type { InstallRequest, SkillProvenance } from '../shared/types'
import { installDirectory, stageDirectory } from './atomic-directory'
import { ensureClaudeLink, removeManagedClaudeLink } from './claude-links'
import { buildContentManifest } from './content-manifest'
import { parseSkillMetadata } from './frontmatter'
import {
  findSkillDirectory,
  getTreeHash,
  materializeRevision,
  resolveRevision,
} from './git-transport'
import { setLockEntry } from './lock-file'
import { getScopePaths, type ManagerRoots } from './paths'
import { normalizeSource } from './source'

export async function installSkill(roots: ManagerRoots, request: InstallRequest): Promise<string> {
  const source = normalizeSource(request.source, request.skill, request.ref)
  const remote = await resolveRevision(source)
  const temporaryRoot = await mkdtemp(join(tmpdir(), 'guoba-skills-install-'))
  const repository = join(temporaryRoot, 'repository')
  try {
    await materializeRevision(source.sourceUrl, remote, repository)
    const skillPath = await findSkillDirectory(
      repository,
      source.requestedSkill,
      source.requestedSubpath,
    )
    const content = await readFile(join(skillPath, 'SKILL.md'), 'utf8')
    const folder = chooseFolderName(source.requestedSkill, skillPath, content)
    const paths = getScopePaths(roots, request.scope)
    const target = join(paths.canonicalRoot, folder)
    if (await exists(target)) throw new Error(`Canonical Skill “${folder}” already exists.`)
    const manifest = await buildContentManifest(skillPath)
    const treeHash = await getTreeHash(repository, skillPath)
    const provenance = createProvenance({
      source,
      remote,
      skillPath,
      repository,
      treeHash,
      contentHash: manifest.contentHash,
    })
    const staged = await stageDirectory(skillPath, target)
    try {
      await installDirectory(staged, target, async () => {
        await ensureClaudeLink(paths, folder)
        await setLockEntry(paths.lockPath, folder, provenance)
      })
    } catch (error) {
      await removeManagedClaudeLink(paths, folder)
      await rm(staged, { force: true, recursive: true })
      throw error
    }
    return `${request.scope}:${folder}`
  } finally {
    await rm(temporaryRoot, { force: true, recursive: true })
  }
}

function chooseFolderName(requested: string | undefined, path: string, content: string): string {
  const fallback = basename(path)
  const metadata = parseSkillMetadata(content, fallback)
  const candidate = requested ?? metadata.name ?? fallback
  if (!/^[\w.-]+$/u.test(candidate) || candidate.startsWith('.')) {
    throw new Error(`Skill folder name “${candidate}” is not safe.`)
  }
  return candidate
}

function createProvenance(input: {
  source: ReturnType<typeof normalizeSource>
  remote: Awaited<ReturnType<typeof resolveRevision>>
  skillPath: string
  repository: string
  treeHash: string
  contentHash: `sha256:${string}`
}): SkillProvenance {
  const now = new Date().toISOString()
  const subpath = relative(input.repository, input.skillPath).split(sep).join('/')
  return {
    source: input.source.source,
    sourceType: input.source.sourceType,
    sourceUrl: input.source.sourceUrl,
    skillPath: subpath ? `${subpath}/SKILL.md` : 'SKILL.md',
    branch: input.remote.branch,
    requestedRef: input.source.requestedRef,
    refPolicy: input.source.requestedRef ? 'explicit' : 'captured-default',
    revision: input.remote.revision,
    treeHash: input.treeHash,
    contentHash: input.contentHash,
    computedHash: input.contentHash.replace(/^sha256:/u, ''),
    hashProfile: 'guoba-skill-v1',
    catalog: input.source.catalog,
    installedAt: now,
    updatedAt: now,
    lastChecked: {
      at: now,
      revision: input.remote.revision,
      treeHash: input.treeHash,
      contentHash: input.contentHash,
    },
  }
}

async function exists(path: string): Promise<boolean> {
  try {
    await lstat(path)
    return true
  } catch (error) {
    if (typeof error === 'object' && error !== null && 'code' in error && error.code === 'ENOENT') {
      return false
    }
    throw error
  }
}
