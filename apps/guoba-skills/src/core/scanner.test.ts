import { mkdir, readlink, symlink, writeFile } from 'node:fs/promises'
import { join, relative } from 'node:path'

import { afterEach, describe, expect, it } from 'vitest'

import { ensureClaudeLink, makeClaudeSkillCanonical } from './claude-links'
import { getManagerRoots, getScopePaths } from './paths'
import { scanInventory } from './scanner'
import { createTestWorkspace, writeTestSkill, type TestWorkspace } from './test-helpers'

const workspaces: TestWorkspace[] = []
afterEach(async () => Promise.all(workspaces.splice(0).map((fixture) => fixture.cleanup())))

describe('Project and User inventory', () => {
  it('aggregates both scopes and reports Claude link health', async () => {
    const fixture = await workspace()
    const roots = getManagerRoots(fixture.project, fixture.home)
    const project = getScopePaths(roots, 'project')
    const user = getScopePaths(roots, 'user')
    await writeTestSkill(project.canonicalRoot, 'project-skill', 'Project body', 'project-skill')
    await mkdir(project.claudeRoot, { recursive: true })
    await symlink(
      relative(project.claudeRoot, join(project.canonicalRoot, 'project-skill')),
      join(project.claudeRoot, 'project-skill'),
    )
    await writeTestSkill(user.canonicalRoot, 'user-skill', 'User body', 'user-skill')
    await writeTestSkill(project.claudeRoot, 'claude-only', 'Claude body', 'claude-only')

    const inventory = await scanInventory(roots)
    expect(inventory.skills.map(({ id }) => id)).toEqual([
      'project:claude-only',
      'project:project-skill',
      'user:user-skill',
    ])
    expect(inventory.skills.find(({ id }) => id === 'project:project-skill')?.linkStatus).toBe(
      'healthy',
    )
    expect(inventory.skills.find(({ id }) => id === 'user:user-skill')?.linkStatus).toBe('missing')
    expect(inventory.skills.find(({ id }) => id === 'project:claude-only')?.location).toBe(
      'claude_only',
    )
  })

  it('repairs a missing link without copying Skill content', async () => {
    const fixture = await workspace()
    const roots = getManagerRoots(fixture.project, fixture.home)
    const paths = getScopePaths(roots, 'project')
    await writeTestSkill(paths.canonicalRoot, 'demo', 'Body', 'demo')
    await ensureClaudeLink(paths, 'demo')
    expect(await readlink(join(paths.claudeRoot, 'demo'))).toBe(
      relative(paths.claudeRoot, join(paths.canonicalRoot, 'demo')),
    )
  })

  it('never overwrites a real Claude directory', async () => {
    const fixture = await workspace()
    const roots = getManagerRoots(fixture.project, fixture.home)
    const paths = getScopePaths(roots, 'project')
    await writeTestSkill(paths.canonicalRoot, 'demo', 'Canonical', 'demo')
    await writeTestSkill(paths.claudeRoot, 'demo', 'Independent', 'demo')
    await expect(ensureClaudeLink(paths, 'demo')).rejects.toThrow(/not overwritten|real directory/u)
    expect(await readlink(join(paths.claudeRoot, 'demo')).catch(() => 'real')).toBe('real')
  })

  it('promotes Claude-only content and replaces it with a symlink', async () => {
    const fixture = await workspace()
    const roots = getManagerRoots(fixture.project, fixture.home)
    const paths = getScopePaths(roots, 'project')
    await writeTestSkill(paths.claudeRoot, 'legacy', 'Legacy', 'legacy')
    await makeClaudeSkillCanonical(paths, 'legacy')
    expect(await readlink(join(paths.claudeRoot, 'legacy'))).toContain('.agents/skills/legacy')
    await expect(
      writeFile(join(paths.canonicalRoot, 'legacy', 'touch.txt'), 'ok'),
    ).resolves.toBeUndefined()
  })
})

async function workspace(): Promise<TestWorkspace> {
  const fixture = await createTestWorkspace()
  workspaces.push(fixture)
  return fixture
}
