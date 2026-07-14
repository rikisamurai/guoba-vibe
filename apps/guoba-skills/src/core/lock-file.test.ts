import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterEach, describe, expect, it } from 'vitest'

import { readLockFile, setLockEntry } from './lock-file'

const roots: string[] = []
afterEach(async () => Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true }))))

describe('lock-file compatibility', () => {
  it('reads the existing version 1 skills lock format', async () => {
    const root = await temporaryRoot()
    const path = join(root, 'skills-lock.json')
    await writeFile(
      path,
      JSON.stringify({
        version: 1,
        skills: {
          demo: {
            source: 'owner/repo',
            sourceType: 'github',
            skillPath: 'skills/demo/SKILL.md',
            computedHash: 'abc',
          },
        },
      }),
    )
    const lock = await readLockFile(path)
    expect(lock.skills.demo.sourceUrl).toBe('https://github.com/owner/repo.git')
    expect(lock.skills.demo.computedHash).toBe('abc')
  })

  it('writes rich provenance atomically in a visible lock file', async () => {
    const root = await temporaryRoot()
    const path = join(root, 'skills-lock.json')
    await setLockEntry(path, 'demo', {
      source: 'owner/repo',
      sourceType: 'github',
      skillPath: 'skills/demo/SKILL.md',
      revision: 'deadbeef',
      contentHash: `sha256:${'a'.repeat(64)}`,
      hashProfile: 'guoba-skill-v1',
    })
    const text = await readFile(path, 'utf8')
    expect(text).toContain('"version": 2')
    expect(text).toContain('"revision": "deadbeef"')
    expect(text.endsWith('\n')).toBe(true)
  })
})

async function temporaryRoot(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), 'guoba-lock-'))
  roots.push(root)
  return root
}
