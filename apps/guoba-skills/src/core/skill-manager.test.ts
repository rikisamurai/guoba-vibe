import { chmod, lstat, mkdir, readFile, readlink, symlink, writeFile } from 'node:fs/promises'
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
    await Promise.all([manager.apply(preview.previewId), manager.discard(preview.previewId)])
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

  it('keeps every result when checking multiple Skills together', async () => {
    const fixture = await workspace()
    await writeTestSkill(fixture.source, 'demo', 'Demo A')
    await writeTestSkill(fixture.source, 'helper', 'Helper A')
    await commitAll(fixture.source, 'version A')
    const manager = new SkillManager(getManagerRoots(fixture.project, fixture.home))
    await Promise.all(
      ['demo', 'helper'].map((skill) =>
        manager.install({
          source: pathToFileURL(fixture.source).toString(),
          scope: 'project',
          skill,
        }),
      ),
    )
    await writeTestSkill(fixture.source, 'demo', 'Demo B')
    await writeTestSkill(fixture.source, 'helper', 'Helper B')
    const revision = await commitAll(fixture.source, 'version B')

    const checked = await manager.check()
    expect(
      checked.skills
        .filter(({ scope }) => scope === 'project')
        .map(({ updateStatus }) => updateStatus),
    ).toEqual(['update_available', 'update_available'])
    const lock = await readFile(getScopePaths(manager.roots, 'project').lockPath, 'utf8')
    expect(lock.match(new RegExp(revision, 'gu'))).toHaveLength(2)
  })

  it('serializes competing applies so canonical content is never deleted', async () => {
    const fixture = await workspace()
    await writeTestSkill(fixture.source, 'demo', 'Version A')
    await commitAll(fixture.source, 'version A')
    const roots = getManagerRoots(fixture.project, fixture.home)
    const first = new SkillManager(roots)
    const second = new SkillManager(roots)
    await first.install({
      source: pathToFileURL(fixture.source).toString(),
      scope: 'project',
      skill: 'demo',
    })
    await writeTestSkill(fixture.source, 'demo', 'Version B')
    await commitAll(fixture.source, 'version B')
    const previewB = await first.prepare('project:demo')
    await writeTestSkill(fixture.source, 'demo', 'Version C')
    await commitAll(fixture.source, 'version C')
    const previewC = await second.prepare('project:demo')

    const results = await Promise.allSettled([
      first.apply(previewB.previewId),
      second.apply(previewC.previewId),
    ])
    expect(results.map(({ status }) => status).toSorted()).toEqual(['fulfilled', 'rejected'])
    const content = await readFile(
      join(getScopePaths(roots, 'project').canonicalRoot, 'demo', 'SKILL.md'),
      'utf8',
    )
    expect(content).toMatch(/Version [BC]/u)
  })

  it('serializes check with apply so stale provenance cannot win', async () => {
    const fixture = await workspace()
    await writeTestSkill(fixture.source, 'demo', 'Version A')
    await commitAll(fixture.source, 'version A')
    const roots = getManagerRoots(fixture.project, fixture.home)
    const updater = new SkillManager(roots)
    const checker = new SkillManager(roots)
    await updater.install({
      source: pathToFileURL(fixture.source).toString(),
      scope: 'project',
      skill: 'demo',
    })
    await writeTestSkill(fixture.source, 'demo', 'Version B')
    await commitAll(fixture.source, 'version B')
    const preview = await updater.prepare('project:demo')
    const bin = join(fixture.root, 'slow-git')
    await mkdir(bin)
    await writeFile(
      join(bin, 'git'),
      '#!/bin/sh\nif [ "$1" = "ls-remote" ]; then /bin/sleep 0.2; fi\nexec /usr/bin/git "$@"\n',
    )
    await chmod(join(bin, 'git'), 0o755)
    const originalPath = process.env.PATH
    process.env.PATH = `${bin}:${originalPath ?? ''}`
    try {
      const checking = checker.check('project:demo')
      await new Promise((resolveDelay) => setTimeout(resolveDelay, 50))
      await Promise.all([checking, updater.apply(preview.previewId)])
    } finally {
      process.env.PATH = originalPath
    }
    const record = (await updater.inventory()).skills.find(({ id }) => id === 'project:demo')
    expect(record?.provenance?.revision).toBe(preview.remoteRevision)
    expect(record?.updateStatus).toBe('up_to_date')
  })

  it('rejects managed path ancestors that are symbolic links', async () => {
    const fixture = await workspace()
    await writeTestSkill(fixture.source, 'demo', 'Version A')
    await commitAll(fixture.source, 'version A')
    const victim = join(fixture.root, 'victim')
    await mkdir(victim)
    await symlink(victim, join(fixture.project, '.agents'), 'dir')
    const manager = new SkillManager(getManagerRoots(fixture.project, fixture.home))

    await expect(
      manager.install({
        source: pathToFileURL(fixture.source).toString(),
        scope: 'project',
        skill: 'demo',
      }),
    ).rejects.toThrow(/symbolic-link ancestor/u)
    await expect(lstat(join(victim, 'skills', 'demo'))).rejects.toMatchObject({ code: 'ENOENT' })
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
