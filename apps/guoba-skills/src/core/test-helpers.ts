import { execFile } from 'node:child_process'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { promisify } from 'node:util'

const execFileAsync = promisify(execFile)

export interface TestWorkspace {
  root: string
  project: string
  home: string
  source: string
  cleanup: () => Promise<void>
}

export async function createTestWorkspace(): Promise<TestWorkspace> {
  const root = await mkdtemp(join(tmpdir(), 'guoba-skills-test-'))
  const project = join(root, 'project')
  const home = join(root, 'home')
  const source = join(root, 'source')
  await Promise.all([mkdir(project), mkdir(home), mkdir(source)])
  await git(source, ['init', '--initial-branch=main'])
  await git(source, ['config', 'user.name', 'Guoba Tests'])
  await git(source, ['config', 'user.email', 'tests@guoba.dev'])
  return {
    root,
    project,
    home,
    source,
    cleanup: () => rm(root, { force: true, recursive: true }),
  }
}

export async function writeTestSkill(
  root: string,
  name: string,
  body: string,
  folder = join('skills', name),
): Promise<string> {
  const directory = join(root, folder)
  await mkdir(directory, { recursive: true })
  await writeFile(
    join(directory, 'SKILL.md'),
    `---\nname: ${name}\ndescription: Test ${name}\n---\n\n# ${name}\n\n${body}\n`,
    'utf8',
  )
  return directory
}

export async function commitAll(repository: string, message: string): Promise<string> {
  await git(repository, ['add', '.'])
  await git(repository, ['commit', '--quiet', '-m', message])
  return (await git(repository, ['rev-parse', 'HEAD'])).trim()
}

async function git(cwd: string, args: string[]): Promise<string> {
  const { stdout } = await execFileAsync('git', args, { cwd, encoding: 'utf8' })
  return stdout
}
