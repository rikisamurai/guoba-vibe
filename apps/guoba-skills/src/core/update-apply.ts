import { rm } from 'node:fs/promises'

import type { SkillProvenance, SkillRecord, UpdatePreview } from '../shared/types'
import { installDirectory, stageDirectory } from './atomic-directory'
import { ensureClaudeLink } from './claude-links'
import { buildContentManifest } from './content-manifest'
import { withFileLock } from './file-lock'
import type { RemoteRevision } from './git-transport'
import { setLockEntry } from './lock-file'
import type { ManagerRoots } from './paths'
import { getSafeScopePaths } from './scope-safety'
import { folderFromSkillId } from './skill-id'

export interface StoredPreview {
  public: UpdatePreview
  record: SkillRecord
  remote: RemoteRevision
  remoteSkillPath: string
  temporaryRoot: string
  localWasModified: boolean
}

export async function applyStoredPreview(
  roots: ManagerRoots,
  stored: StoredPreview,
): Promise<void> {
  const { record, public: preview } = stored
  await withFileLock(record.canonicalPath, async () => {
    if (stored.localWasModified) {
      throw new Error('This Skill has local changes. Guoba Skills will not overwrite them.')
    }
    const current = await buildContentManifest(record.canonicalPath)
    if (current.contentHash !== preview.baseContentHash) {
      throw new Error('The Skill changed after preview. Prepare the update again.')
    }
    const paths = await getSafeScopePaths(roots, record.scope)
    const staged = await stageDirectory(stored.remoteSkillPath, record.canonicalPath)
    try {
      await installDirectory(staged, record.canonicalPath, async () => {
        const folder = folderFromSkillId(record.id)
        await ensureClaudeLink(paths, folder)
        await setLockEntry(paths.lockPath, folder, nextProvenance(record, stored))
      })
    } catch (error) {
      await rm(staged, { force: true, recursive: true })
      throw error
    }
  })
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
