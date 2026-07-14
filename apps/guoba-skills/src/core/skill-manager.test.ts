import { lstat, readFile, readlink, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'

import { afterEach, describe, expect, it } from 'vitest'

import { getManagerRoots, getScopePaths } from './paths'
import { SkillManager } from './skill-manager'
import { commitAll, createTestWorkspace, writeTestSkill, type TestWorkspace } from './test-helpers'

const workspaces: TestWorkspace[] = []
afterEach(async () => Promise.all(workspaces.splice(0).map((fixture) => fixture.cleanup())))

describe('SkillManager Git lifecycle', () => {
  it('installs, checks, previews, and applies the exact reviewed revision', async () => {
    const fixture = await workspace()
    await writeTestSkill(fixture.source, 'demo', 'Version A')
    await commitAll(fixture.source, 'version A')
    const manager = new SkillManager(getManagerRoots(fixture.project, fixture.home))

    const installed = await manager.install({
      source: pathToFileURL(fixture.source).toString(),
      scope: 'project',
      skill: 'demo',
    })
    expect(installed.id).toBe('project:demo')
    const paths = getScopePaths(manager.roots, 'project')
    expect(await readlink(join(paths.claudeRoot, 'demo'))).toContain('.agents/skills/demo')

    await writeTestSkill(fixture.source, 'demo', 'Version B')
    const revisionB = await commitAll(fixture.source, 'version B')
    const checked = await manager.check('project:demo')
    expect(checked.skills.find(({ id }) => id === 'project:demo')?.updateStatus).toBe(
      'update_available',
    )
    const preview = await manager.prepare('project:demo')
    expect(preview.remoteRevision).toBe(revisionB)
    expect(preview.changes).toEqual(
      expect.arrayContaining([expect.objectContaining({ path: 'SKILL.md', kind: 'modified' })]),
    )

    await writeTestSkill(fixture.source, 'demo', 'Version C')
    await commitAll(fixture.source, 'version C')
    await manager.apply(preview.previewId)
    expect(await readFile(join(paths.canonicalRoot, 'demo', 'SKILL.md'), 'utf8')).toContain(
      'Version B',
    )
    expect(await readFile(paths.lockPath, 'utf8')).toContain(revisionB)
  })

  it('refuses to overwrite local changes even after presenting a diff', async () => {
    const fixture = await workspace()
    await writeTestSkill(fixture.source, 'demo', 'Version A')
    await commitAll(fixture.source, 'version A')
    const manager = new SkillManager(getManagerRoots(fixture.project, fixture.home))
    await manager.install({
      source: pathToFileURL(fixture.source).toString(),
      scope: 'project',
      skill: 'demo',
    })
    const paths = getScopePaths(manager.roots, 'project')
    await writeFile(join(paths.canonicalRoot, 'demo', 'local.txt'), 'local edit')
    await writeTestSkill(fixture.source, 'demo', 'Version B')
    await commitAll(fixture.source, 'version B')
    const preview = await manager.prepare('project:demo')
    await expect(manager.apply(preview.previewId)).rejects.toThrow(/local changes/u)
    await expect(readFile(join(paths.canonicalRoot, 'demo', 'local.txt'), 'utf8')).resolves.toBe(
      'local edit',
    )
  })

  it('ignores repository commits that do not change the installed Skill', async () => {
    const fixture = await workspace()
    await writeTestSkill(fixture.source, 'demo', 'Version A')
    await commitAll(fixture.source, 'version A')
    const manager = new SkillManager(getManagerRoots(fixture.project, fixture.home))
    await manager.install({
      source: pathToFileURL(fixture.source).toString(),
      scope: 'project',
      skill: 'demo',
    })

    await writeFile(join(fixture.source, 'README.md'), 'Unrelated repository change')
    const latestRevision = await commitAll(fixture.source, 'unrelated change')
    const checked = await manager.check('project:demo')
    const record = checked.skills.find(({ id }) => id === 'project:demo')
    expect(record?.updateStatus).toBe('up_to_date')
    expect(record?.provenance?.revision).toBe(latestRevision)
    expect(record?.provenance?.lastChecked?.revision).toBe(latestRevision)
  })

  it('rolls back installation when a real Claude directory conflicts', async () => {
    const fixture = await workspace()
    await writeTestSkill(fixture.source, 'demo', 'Version A')
    await commitAll(fixture.source, 'version A')
    const manager = new SkillManager(getManagerRoots(fixture.project, fixture.home))
    const paths = getScopePaths(manager.roots, 'project')
    await writeTestSkill(paths.claudeRoot, 'demo', 'Independent Claude copy', 'demo')
    await expect(
      manager.install({
        source: pathToFileURL(fixture.source).toString(),
        scope: 'project',
        skill: 'demo',
      }),
    ).rejects.toThrow(/not overwritten|real directory/u)
    await expect(lstat(join(paths.canonicalRoot, 'demo'))).rejects.toMatchObject({ code: 'ENOENT' })
    expect(await readFile(join(paths.claudeRoot, 'demo', 'SKILL.md'), 'utf8')).toContain(
      'Independent',
    )
  })
})

async function workspace(): Promise<TestWorkspace> {
  const fixture = await createTestWorkspace()
  workspaces.push(fixture)
  return fixture
}
