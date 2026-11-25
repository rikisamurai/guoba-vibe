import { mkdtemp, readFile, readdir, realpath, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'

import { afterEach, describe, expect, it, vi } from 'vitest'

import { MANIFEST, syncNotes } from '../scripts/wiki-sync/write.mjs'

const { beforeRename } = vi.hoisted(() => ({
  beforeRename: vi.fn<(file: string) => void | Promise<void>>(),
}))

vi.mock('node:fs/promises', async (importOriginal) => {
  const fs = await importOriginal<typeof import('node:fs/promises')>()
  return {
    ...fs,
    async rename(from: string, to: string) {
      await beforeRename(to)
      await fs.rename(from, to)
    },
  }
})

const targets: string[] = []
async function targetDirectory() {
  const target = await realpath(await mkdtemp(path.join(tmpdir(), 'wiki-sync-recovery-')))
  targets.push(target)
  return target
}

afterEach(async () => {
  beforeRename.mockReset()
  await Promise.all(targets.splice(0).map((target) => rm(target, { recursive: true, force: true })))
})

const before = new Map([
  ['a.md', '# Old A'],
  ['b.md', '# Old B'],
])
const wanted = new Map([
  ['a.md', '# New A'],
  ['b.md', '# New B'],
])
const version = { sha: 'b'.repeat(40) }

function failReplacement(name: string) {
  beforeRename.mockImplementation((file) => {
    if (path.basename(file) === name) throw new Error('simulated replacement failure')
  })
}

function latch() {
  let resolve!: () => void
  const promise = new Promise<void>((done) => {
    resolve = done
  })
  return { promise, resolve }
}

describe('interrupted wiki sync', () => {
  it('keeps another writer out while a note replacement is in progress', async () => {
    const target = await targetDirectory()
    const paused = latch()
    const resume = latch()
    let intercepted = false
    beforeRename.mockImplementation(async (file) => {
      if (!intercepted && path.basename(file) === 'a.md') {
        intercepted = true
        paused.resolve()
        await resume.promise
      }
    })
    const first = syncNotes(target, wanted, version)
    try {
      const stage = await Promise.race([
        first.then(() => 'completed'),
        paused.promise.then(() => 'paused'),
      ])
      expect(stage).toBe('paused')
      await expect(syncNotes(target, wanted, version)).rejects.toThrow(
        'Another wiki sync is active',
      )
    } finally {
      resume.resolve()
      await first
    }
    expect(await syncNotes(target, wanted, version)).toMatchObject({ written: 0, unchanged: 2 })
  })

  it.each([false, true])(
    'resumes a partial note update with an existing manifest=%s',
    async (existing) => {
      const target = await targetDirectory()
      const note = (name: string) => path.join(target, name)
      if (existing) await syncNotes(target, before, { sha: 'a'.repeat(40) })
      const priorManifest = existing ? await readFile(note(MANIFEST), 'utf8') : undefined
      await writeFile(note('.wiki-sync-other.tmp'), 'keep')
      failReplacement('b.md')

      await expect(syncNotes(target, wanted, version)).rejects.toThrow(
        'simulated replacement failure',
      )
      expect(await readFile(note('a.md'), 'utf8')).toBe('# New A')
      if (existing) {
        expect(await readFile(note('b.md'), 'utf8')).toBe('# Old B')
        expect(await readFile(note(MANIFEST), 'utf8')).toBe(priorManifest)
      } else {
        await expect(readFile(note('b.md'))).rejects.toMatchObject({ code: 'ENOENT' })
        await expect(readFile(note(MANIFEST))).rejects.toMatchObject({ code: 'ENOENT' })
      }
      beforeRename.mockReset()
      await expect(syncNotes(target, wanted, version)).resolves.toMatchObject({
        written: 1,
        unchanged: 1,
      })
      await expect(syncNotes(target, wanted, version)).resolves.toMatchObject({
        written: 0,
        unchanged: 2,
        manifestChanged: false,
      })
      expect((await readdir(target)).toSorted()).toEqual(
        [MANIFEST, '.wiki-sync-other.tmp', 'a.md', 'b.md'].toSorted(),
      )
      expect(await readFile(note('.wiki-sync-other.tmp'), 'utf8')).toBe('keep')
    },
  )

  it('retains the old manifest when final replacement fails and resumes without rewriting notes', async () => {
    const target = await targetDirectory()
    await syncNotes(target, before, { sha: 'a'.repeat(40) })
    const manifestPath = path.join(target, MANIFEST)
    const oldManifest = await readFile(manifestPath, 'utf8')
    failReplacement(MANIFEST)
    await expect(syncNotes(target, wanted, version)).rejects.toThrow(
      'simulated replacement failure',
    )
    expect(await readFile(manifestPath, 'utf8')).toBe(oldManifest)
    beforeRename.mockReset()
    await expect(syncNotes(target, wanted, version)).resolves.toMatchObject({
      written: 0,
      unchanged: 2,
      manifestChanged: true,
    })
    expect(JSON.parse(await readFile(manifestPath, 'utf8')).source_sha).toBe(version.sha)
  })

  it('protects an edit made after a partial initial sync', async () => {
    const target = await targetDirectory()
    failReplacement('b.md')
    await expect(syncNotes(target, wanted, version)).rejects.toThrow(
      'simulated replacement failure',
    )
    beforeRename.mockReset()
    await writeFile(path.join(target, 'a.md'), 'my edit')
    await expect(syncNotes(target, wanted, version)).rejects.toThrow(
      'Edited generated note conflict',
    )
    expect(await readFile(path.join(target, 'a.md'), 'utf8')).toBe('my edit')
    await expect(readFile(path.join(target, 'b.md'))).rejects.toMatchObject({ code: 'ENOENT' })
  })

  it('will not claim a pre-existing identical note without a generation record', async () => {
    const target = await targetDirectory()
    await writeFile(path.join(target, 'a.md'), '# New A')
    await expect(syncNotes(target, wanted, version)).rejects.toThrow('Unmanaged file conflict')
    await expect(readFile(path.join(target, MANIFEST))).rejects.toMatchObject({ code: 'ENOENT' })
  })

  it('rejects a torn existing manifest before changing any note', async () => {
    const target = await targetDirectory()
    await writeFile(path.join(target, MANIFEST), '{"version":')
    await expect(syncNotes(target, wanted, version)).rejects.toThrow(`Invalid JSON in ${MANIFEST}`)
    await expect(readFile(path.join(target, 'a.md'))).rejects.toMatchObject({ code: 'ENOENT' })
  })
})
