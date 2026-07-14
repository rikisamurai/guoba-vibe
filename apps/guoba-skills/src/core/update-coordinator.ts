import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join, sep } from 'node:path'

import type { SkillProvenance, SkillRecord, UpdatePreview } from '../shared/types'
import { buildContentManifest } from './content-manifest'
import {
  findSkillDirectory,
  getTreeHash,
  materializeRevision,
  resolveRevision,
  type RemoteRevision,
} from './git-transport'
import { setLockEntry } from './lock-file'
import type { ManagerRoots } from './paths'
import { getSafeScopePaths } from './scope-safety'
import { diffSkillManifests, flattenSkillDiff } from './skill-diff'
import { folderFromSkillId } from './skill-id'
import { assertSafeSourceUrl, type ResolvedSourceInput } from './source'
import { applyStoredPreview, type StoredPreview } from './update-apply'
import { reconcileCheckedProvenance } from './update-check'

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
    const paths = await getSafeScopePaths(this.roots, record.scope)
    await setLockEntry(paths.lockPath, folderFromSkillId(record.id), {
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
    await this.#discardForSkill(record.id)
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
    this.#previews.delete(previewId)
    try {
      await applyStoredPreview(this.roots, stored)
    } finally {
      await rm(stored.temporaryRoot, { force: true, recursive: true })
    }
  }

  async discard(previewId: string): Promise<void> {
    const stored = this.#previews.get(previewId)
    if (!stored) return
    this.#previews.delete(previewId)
    await rm(stored.temporaryRoot, { force: true, recursive: true })
  }

  async dispose(): Promise<void> {
    await Promise.all([...this.#previews.keys()].map((previewId) => this.discard(previewId)))
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

  async #discardForSkill(skillId: string): Promise<void> {
    const entries = [...this.#previews.entries()].filter(
      ([, stored]) => stored.record.id === skillId,
    )
    await Promise.all(entries.map(([previewId]) => this.discard(previewId)))
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
  assertSafeSourceUrl(sourceUrl)
  return {
    source: provenance.source,
    sourceType: provenance.sourceType === 'github' ? 'github' : 'git',
    sourceUrl,
    requestedRef: provenance.requestedRef ?? provenance.branch ?? undefined,
  }
}
