import type { SkillProvenance } from '../shared/types'
import type { RemoteRevision } from './git-transport'

export function reconcileCheckedProvenance(
  provenance: SkillProvenance,
  remote: RemoteRevision,
  localContentHash: string,
  remoteContentHash?: string,
  treeHash?: string,
): SkillProvenance {
  const remoteMatchesInstalled = Boolean(
    provenance.contentHash && remoteContentHash === provenance.contentHash,
  )
  const remoteMatchesLocal = remoteContentHash === localContentHash
  if (!remoteMatchesInstalled && !remoteMatchesLocal) return provenance
  return {
    ...provenance,
    branch: remote.branch,
    revision: remote.revision,
    treeHash,
    contentHash: remoteMatchesLocal ? localContentHash : provenance.contentHash,
    computedHash: remoteMatchesLocal
      ? localContentHash.replace(/^sha256:/u, '')
      : provenance.computedHash,
    hashProfile: 'guoba-skill-v1',
  }
}
