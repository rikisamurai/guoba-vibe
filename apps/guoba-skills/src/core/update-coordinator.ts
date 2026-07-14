import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join, sep } from 'node:path'

import type { SkillProvenance, SkillRecord, UpdatePreview } from '../shared/types'
import { installDirectory, stageDirectory } from './atomic-directory'
import { ensureClaudeLink } from './claude-links'
import { buildContentManifest } from './content-manifest'
import {
  findSkillDirectory,
  getTreeHash,
  materializeRevision,
  resolveRevision,
  type RemoteRevision,
} from './git-transport'
import { setLockEntry } from './lock-file'
import { getScopePaths, type ManagerRoots } from './paths'
import { diffSkillManifests, flattenSkillDiff } from './skill-diff'
import type { ResolvedSourceInput } from './source'
import { reconcileCheckedProvenance } from './update-check'

interface StoredPreview {
  public: UpdatePreview
  record: SkillRecord
  remote: RemoteRevision
  remoteSkillPath: string
  temporaryRoot: string
  localWasModified: boolean
}

export class UpdateCoordinator {
  readonly #previews = new Map<string, StoredPreview>()

  constructor(private readonly roots: ManagerRoots) {}

  async check(record: SkillRecord): Promise<void> {
    const provenance = requireProvenance(record)
    const source = sourceFrom(provenance)
    const remote = await resolveRevision(source)
    const local = await buildContentManifest(record.canonicalPath)
    let remoteHash = provenance.contentHash
    let treeHash = provenance.treeHash
    if (remote.revision !== provenance.revision || !remoteHash) {
      const materialized = await this.#materialize(record, source, remote)
      try {
        const remoteManifest = await buildContentManifest(materialized.skillPath)
        remoteHash = remoteManifest.contentHash
        treeHash = await getTreeHash(materialized.root, materialized.skillPath)
      } finally {
        await rm(materialized.temporaryRoot, { force: true, recursive: true })
      }
    }
    const checkedProvenance = reconcileCheckedProvenance(
      provenance,
      remote,
      local.contentHash,
      remoteHash,
      treeHash,
    )
    await setLockEntry(getScopePaths(this.roots, record.scope).lockPath, folderName(record.id), {
      ...checkedProvenance,
      lastChecked: {
        at: new Date().toISOString(),
        revision: remote.revision,
        treeHash,
        contentHash: remoteHash ?? local.contentHash,
      },
    })
  }

  async prepare(record: SkillRecord): Promise<UpdatePreview> {
    const provenance = requireProvenance(record)
    const source = sourceFrom(provenance)
    const remote = await resolveRevision(source)
    const materialized = await this.#materialize(record, source, remote)
    try {
      const local = await buildContentManifest(record.canonicalPath)
      const upstream = await buildContentManifest(materialized.skillPath)
      const treeHash = await getTreeHash(materialized.root, materialized.skillPath)
      const previewId = crypto.randomUUID()
      const preview: UpdatePreview = {
        previewId,
        skillId: record.id,
        baseContentHash: local.contentHash,
        remoteRevision: remote.revision,
        remoteTreeHash: treeHash,
        remoteContentHash: upstream.contentHash,
        changes: flattenSkillDiff(diffSkillManifests(local, upstream)),
      }
      this.#previews.set(previewId, {
        public: preview,
        record,
        remote,
        remoteSkillPath: materialized.skillPath,
        temporaryRoot: materialized.temporaryRoot,
        localWasModified:
          provenance.hashProfile === 'guoba-skill-v1' &&
          Boolean(provenance.contentHash) &&
          provenance.contentHash !== local.contentHash,
      })
      return preview
    } catch (error) {
      await rm(materialized.temporaryRoot, { force: true, recursive: true })
      throw error
    }
  }

  async apply(previewId: string): Promise<void> {
    const stored = this.#previews.get(previewId)
    if (!stored) throw new Error('This update preview expired. Prepare it again.')
    const { record, public: preview } = stored
    try {
      if (stored.localWasModified) {
        throw new Error('This Skill has local changes. Guoba Skills will not overwrite them.')
      }
      const current = await buildContentManifest(record.canonicalPath)
      if (current.contentHash !== preview.baseContentHash) {
        throw new Error('The Skill changed after preview. Prepare the update again.')
      }
      const staged = await stageDirectory(stored.remoteSkillPath, record.canonicalPath)
      const paths = getScopePaths(this.roots, record.scope)
      const provenance = nextProvenance(record, stored)
      try {
        await installDirectory(staged, record.canonicalPath, async () => {
          await ensureClaudeLink(paths, folderName(record.id))
          await setLockEntry(paths.lockPath, folderName(record.id), provenance)
        })
      } catch (error) {
        await rm(staged, { force: true, recursive: true })
        throw error
      }
    } finally {
      this.#previews.delete(previewId)
      await rm(stored.temporaryRoot, { force: true, recursive: true })
    }
  }

  async #materialize(record: SkillRecord, source: ResolvedSourceInput, remote: RemoteRevision) {
    const temporaryRoot = await mkdtemp(join(tmpdir(), 'guoba-skills-'))
    try {
      const root = join(temporaryRoot, 'repository')
      await materializeRevision(source.sourceUrl, remote, root)
      const subpath = dirname(record.provenance?.skillPath ?? 'SKILL.md')
        .split(sep)
        .join('/')
      const skillPath = subpath === '.' ? root : await findSkillDirectory(root, undefined, subpath)
      return { temporaryRoot, root, skillPath }
    } catch (error) {
      await rm(temporaryRoot, { force: true, recursive: true })
      throw error
    }
  }
}

function requireProvenance(record: SkillRecord): SkillProvenance {
  if (record.location !== 'canonical')
    throw new Error('Make this Claude-only Skill canonical first.')
  if (!record.provenance?.sourceUrl) throw new Error('This Skill has no Git source metadata.')
  if (record.provenance.sourceType === 'local')
    throw new Error('Local sources cannot be updated yet.')
  return record.provenance
}

function sourceFrom(provenance: SkillProvenance): ResolvedSourceInput {
  const sourceUrl = provenance.sourceUrl!
  if (/^https?:\/\//u.test(sourceUrl)) {
    const parsed = new URL(sourceUrl)
    if (parsed.username || parsed.password)
      throw new Error('Credential-bearing Git URLs are not supported. Use a credential helper.')
  }
  return {
    source: provenance.source,
    sourceType: provenance.sourceType === 'github' ? 'github' : 'git',
    sourceUrl,
    requestedRef: provenance.requestedRef ?? provenance.branch ?? undefined,
  }
}

function nextProvenance(record: SkillRecord, stored: StoredPreview): SkillProvenance {
  const now = new Date().toISOString()
  const existing = record.provenance!
  return {
    ...existing,
    branch: stored.remote.branch,
    revision: stored.public.remoteRevision,
    treeHash: stored.public.remoteTreeHash,
    contentHash: stored.public.remoteContentHash,
    computedHash: stored.public.remoteContentHash.replace(/^sha256:/u, ''),
    hashProfile: 'guoba-skill-v1',
    updatedAt: now,
    installedAt: existing.installedAt ?? now,
    lastChecked: {
      at: now,
      revision: stored.public.remoteRevision,
      treeHash: stored.public.remoteTreeHash,
      contentHash: stored.public.remoteContentHash,
    },
  }
}

function folderName(id: string): string {
  return id.slice(id.indexOf(':') + 1)
}
