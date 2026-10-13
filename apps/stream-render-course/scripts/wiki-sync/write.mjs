import { createHash } from 'node:crypto'
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'

import { assertPlainPath, relativeNote, statIfPresent } from './paths.mjs'

export const MANIFEST = '.wiki-sync-manifest.json'
const generator = 'stream-render-course'
const digest = (value) => createHash('sha256').update(value).digest('hex')

async function readManifest(target) {
  const file = path.join(target, MANIFEST)
  await assertPlainPath(file)
  const info = await statIfPresent(file)
  if (!info) return { files: {} }
  if (!info.isFile() || info.nlink > 1)
    throw new Error('Sync manifest must be a regular file without hard links')
  const manifest = JSON.parse(await readFile(file, 'utf8'))
  if (
    manifest.version !== 1 ||
    manifest.generator !== generator ||
    !manifest.files ||
    typeof manifest.files !== 'object' ||
    Array.isArray(manifest.files)
  )
    throw new Error('Unrecognized sync manifest; refusing to claim existing files')
  for (const [name, hash] of Object.entries(manifest.files)) {
    relativeNote(name)
    if (!/^[a-f0-9]{64}$/.test(hash)) throw new Error(`Invalid manifest hash: ${name}`)
  }
  return manifest
}

export async function syncNotes(target, notes, { sha, check = false } = {}) {
  await assertPlainPath(target)
  const previous = await readManifest(target)
  const incoming = new Map([...notes.entries()].toSorted(([a], [b]) => a.localeCompare(b)))
  for (const name of incoming.keys()) relativeNote(name)
  const names = [...new Set([...Object.keys(previous.files), ...incoming.keys()])]
  // Check every destination before the first write, including source pages that disappeared.
  const plan = await Promise.all(
    names.map(async (name) => {
      const destination = path.join(target, name)
      await assertPlainPath(destination)
      const info = await statIfPresent(destination)
      if (info && (!info.isFile() || info.nlink > 1))
        throw new Error(`Note must be a regular file without hard links: ${name}`)
      const actual = info ? await readFile(destination, 'utf8') : undefined
      if (actual !== undefined && !Object.hasOwn(previous.files, name))
        throw new Error(`Unmanaged file conflict: ${name}`)
      if (actual !== undefined && digest(actual) !== previous.files[name])
        throw new Error(`Edited generated note conflict: ${name}`)
      const wanted = incoming.get(name)
      const action =
        wanted === undefined
          ? actual === undefined
            ? 'unchanged'
            : 'remove'
          : actual === wanted
            ? 'unchanged'
            : 'write'
      return { name, destination, wanted, action }
    }),
  )
  const files = Object.fromEntries([...incoming].map(([name, content]) => [name, digest(content)]))
  const manifest = JSON.stringify({ version: 1, generator, source_sha: sha, files }, null, 2) + '\n'
  const manifestPath = path.join(target, MANIFEST)
  const manifestChanged =
    !(await statIfPresent(manifestPath)) || (await readFile(manifestPath, 'utf8')) !== manifest
  const report = {
    written: plan.filter(({ action }) => action === 'write').length,
    removed: plan.filter(({ action }) => action === 'remove').length,
    unchanged: plan.filter(({ action }) => action === 'unchanged').length,
    manifestChanged,
    source_sha: sha,
  }
  if (check) return report
  await Promise.all(
    plan
      .filter(({ action }) => action === 'write')
      .map(async ({ destination, wanted }) => {
        await mkdir(path.dirname(destination), { recursive: true })
        await writeFile(destination, wanted, 'utf8')
      }),
  )
  await Promise.all(
    plan.filter(({ action }) => action === 'remove').map(({ destination }) => rm(destination)),
  )
  if (manifestChanged) {
    await mkdir(target, { recursive: true })
    await writeFile(manifestPath, manifest, 'utf8')
  }
  return report
}
