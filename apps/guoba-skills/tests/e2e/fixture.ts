import { execFile } from 'node:child_process'
import { mkdir, rm, writeFile } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { promisify } from 'node:util'

import { getManagerRoots, getScopePaths } from '../../src/core/paths'
import { SkillManager } from '../../src/core/skill-manager'

const execFileAsync = promisify(execFile)

export interface E2eFixture {
  home: string
  project: string
  root: string
  source: string
}

export async function createE2eFixture(name: string): Promise<E2eFixture> {
  const root = resolve('test-results', name)
  const project = join(root, 'project')
  const home = join(root, 'home')
  const source = join(root, 'source')
  await rm(root, { force: true, recursive: true })
  await Promise.all(
    [project, home, source].map((directory) => mkdir(directory, { recursive: true })),
  )
  await git(source, ['init', '--initial-branch=main'])
  await git(source, ['config', 'user.name', 'Guoba E2E'])
  await git(source, ['config', 'user.email', 'e2e@guoba.dev'])
  await writeSkill(join(source, 'skills', 'demo'), 'demo', 'Version A')
  await commit(source, 'version A')

  const manager = new SkillManager(getManagerRoots(project, home))
  await manager.install({
    source: pathToFileURL(source).toString(),
    scope: 'project',
    skill: 'demo',
  })
  const paths = getScopePaths(manager.roots, 'project')
  await writeSkill(join(paths.claudeRoot, 'claude-only'), 'claude-only', 'Claude-only body')
  const user = getScopePaths(manager.roots, 'user')
  await writeSkill(join(user.canonicalRoot, 'user-helper'), 'user-helper', 'User body')

  await writeSkill(join(source, 'skills', 'demo'), 'demo', 'Version B')
  await commit(source, 'version B')
  return { root, project, home, source }
}

async function writeSkill(directory: string, name: string, body: string): Promise<void> {
  await mkdir(directory, { recursive: true })
  await writeFile(
    join(directory, 'SKILL.md'),
    `---\nname: ${name}\ndescription: ${name} E2E fixture\n---\n\n# ${name}\n\n${body}\n`,
    'utf8',
  )
}

async function commit(repository: string, message: string): Promise<void> {
  await git(repository, ['add', '.'])
  await git(repository, ['commit', '--quiet', '-m', message])
}

async function git(cwd: string, args: string[]): Promise<void> {
  await execFileAsync('git', args, { cwd })
}
