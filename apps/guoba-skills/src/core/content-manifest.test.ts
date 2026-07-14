import { chmod, mkdir, mkdtemp, rm, symlink, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import {
  SKILL_HASH_PROFILE,
  UnsupportedSkillEntryError,
  buildContentManifest,
  hashContentManifest,
  type SkillManifestEntry,
} from './content-manifest'

function entry(path: string, content: string, executable = false): SkillManifestEntry {
  return {
    path,
    content: Buffer.from(content),
    executable,
  }
}

describe('buildContentManifest', () => {
  let rootDirectory: string

  beforeEach(async () => {
    rootDirectory = await mkdtemp(join(tmpdir(), 'guoba-skill-manifest-'))
  })

  afterEach(async () => {
    await rm(rootDirectory, { force: true, recursive: true })
  })

  it('builds a stable POSIX-sorted guoba-skill-v1 manifest', async () => {
    await mkdir(join(rootDirectory, 'references'))
    await writeFile(join(rootDirectory, 'z-last.md'), 'last\n')
    await writeFile(join(rootDirectory, 'references', 'guide.md'), 'guide\n')
    await writeFile(join(rootDirectory, 'SKILL.md'), '# Test skill\n')

    const first = await buildContentManifest(rootDirectory)
    const second = await buildContentManifest(rootDirectory)

    expect(first.profile).toBe(SKILL_HASH_PROFILE)
    expect(first.entries.map(({ path }) => path)).toEqual([
      'SKILL.md',
      'references/guide.md',
      'z-last.md',
    ])
    expect(first.contentHash).toMatch(/^sha256:[a-f\d]{64}$/)
    expect(second.contentHash).toBe(first.contentHash)
  })

  it('ignores repository and platform noise at any depth', async () => {
    await mkdir(join(rootDirectory, '.git'))
    await mkdir(join(rootDirectory, '__pycache__'))
    await mkdir(join(rootDirectory, 'scripts'))
    await writeFile(join(rootDirectory, '.git', 'config'), 'ignored')
    await writeFile(join(rootDirectory, '.DS_Store'), 'ignored')
    await writeFile(join(rootDirectory, 'Thumbs.db'), 'ignored')
    await writeFile(join(rootDirectory, '__pycache__', 'main.py'), 'ignored')
    await writeFile(join(rootDirectory, 'scripts', 'cache.pyc'), 'ignored')
    await writeFile(join(rootDirectory, 'scripts', 'main.py'), 'print("ok")\n')

    const manifest = await buildContentManifest(rootDirectory)

    expect(manifest.entries.map(({ path }) => path)).toEqual(['scripts/main.py'])
  })

  it('captures executable mode in the manifest and content hash', async () => {
    const scriptPath = join(rootDirectory, 'run.sh')
    await writeFile(scriptPath, '#!/bin/sh\n')
    await chmod(scriptPath, 0o644)
    const regular = await buildContentManifest(rootDirectory)

    await chmod(scriptPath, 0o755)
    const executable = await buildContentManifest(rootDirectory)

    expect(regular.entries[0]?.executable).toBe(false)
    expect(executable.entries[0]?.executable).toBe(true)
    expect(executable.contentHash).not.toBe(regular.contentHash)
  })

  it('rejects symbolic links inside a skill', async () => {
    await writeFile(join(rootDirectory, 'target.md'), 'target')
    await symlink('target.md', join(rootDirectory, 'alias.md'))

    await expect(buildContentManifest(rootDirectory)).rejects.toMatchObject({
      name: UnsupportedSkillEntryError.name,
      relativePath: 'alias.md',
    })
  })

  it('rejects a symbolic-link skill root', async () => {
    const target = join(rootDirectory, 'target')
    const linkedRoot = join(rootDirectory, 'linked-root')
    await mkdir(target)
    await symlink(target, linkedRoot)

    await expect(buildContentManifest(linkedRoot)).rejects.toMatchObject({
      name: UnsupportedSkillEntryError.name,
      relativePath: '.',
    })
  })
})

describe('hashContentManifest', () => {
  it('is independent of input entry order', () => {
    const one = entry('one.md', 'one')
    const two = entry('nested/two.md', 'two')

    expect(hashContentManifest([one, two])).toBe(hashContentManifest([two, one]))
  })

  it('frames paths and content so concatenation cannot collide', () => {
    const first = hashContentManifest([entry('a', 'bc')])
    const second = hashContentManifest([entry('ab', 'c')])

    expect(first).not.toBe(second)
  })

  it('changes for content, path, and executable-bit changes', () => {
    const baseline = hashContentManifest([entry('SKILL.md', 'one')])

    expect(hashContentManifest([entry('SKILL.md', 'two')])).not.toBe(baseline)
    expect(hashContentManifest([entry('README.md', 'one')])).not.toBe(baseline)
    expect(hashContentManifest([entry('SKILL.md', 'one', true)])).not.toBe(baseline)
  })

  it('rejects non-POSIX and traversing manifest paths', () => {
    expect(() => hashContentManifest([entry('../outside', 'bad')])).toThrow(
      'Invalid skill manifest path',
    )
    expect(() => hashContentManifest([entry('nested\\file.md', 'bad')])).toThrow(
      'Invalid skill manifest path',
    )
  })
})
