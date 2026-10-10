import { readFile } from 'node:fs/promises'
import { join } from 'node:path'

import { expect, it } from 'vitest'

import type { SkillRecord } from '../shared/types'
import { buildContentManifest } from './content-manifest'
import { getManagerRoots, getScopePaths } from './paths'
import { createTestWorkspace, writeTestSkill } from './test-helpers'
import { applyStoredPreview, type StoredPreview } from './update-apply'

it('rejects prepared content that no longer matches the reviewed hash', async () => {
  const fixture = await createTestWorkspace()
  try {
    const roots = getManagerRoots(fixture.project, fixture.home)
    const paths = getScopePaths(roots, 'project')
    const canonicalPath = await writeTestSkill(paths.canonicalRoot, 'demo', 'Version A', 'demo')
    const preparedRoot = join(fixture.root, 'prepared')
    const preparedPath = await writeTestSkill(preparedRoot, 'demo', 'Version B', 'demo')
    const installed = await buildContentManifest(canonicalPath)
    const reviewed = await buildContentManifest(preparedPath)
    await writeTestSkill(preparedRoot, 'demo', 'Unreviewed payload', 'demo')
    const stored = previewFixture(
      recordFixture(canonicalPath, paths.claudeRoot, installed.contentHash),
      preparedRoot,
      preparedPath,
      installed.contentHash,
      reviewed.contentHash,
    )

    await expect(applyStoredPreview(roots, stored)).rejects.toThrow(/changed after review/u)
    await expect(readFile(join(canonicalPath, 'SKILL.md'), 'utf8')).resolves.toContain('Version A')
  } finally {
    await fixture.cleanup()
  }
})

function recordFixture(
  canonicalPath: string,
  claudeRoot: string,
  contentHash: `sha256:${string}`,
): SkillRecord {
  return {
    id: 'project:demo',
    name: 'demo',
    description: 'demo fixture',
    scope: 'project',
    location: 'canonical',
    canonicalPath,
    claudePath: join(claudeRoot, 'demo'),
    linkStatus: 'missing',
    updateStatus: 'update_available',
    content: '',
    files: ['SKILL.md'],
    provenance: {
      source: 'owner/repo',
      sourceType: 'github',
      sourceUrl: 'https://github.com/owner/repo.git',
      skillPath: 'skills/demo/SKILL.md',
      contentHash,
      hashProfile: 'guoba-skill-v1',
    },
  }
}

function previewFixture(
  record: SkillRecord,
  temporaryRoot: string,
  remoteSkillPath: string,
  baseContentHash: string,
  remoteContentHash: string,
): StoredPreview {
  const revision = 'a'.repeat(40)
  return {
    public: {
      previewId: 'reviewed-preview',
      skillId: record.id,
      baseContentHash,
      remoteRevision: revision,
      remoteTreeHash: `git-tree:${'b'.repeat(40)}`,
      remoteContentHash,
      changes: [],
    },
    record,
    remote: { revision, branch: 'main', fetchRef: 'refs/heads/main' },
    remoteSkillPath,
    temporaryRoot,
    localWasModified: false,
  }
}
