import { createHash } from 'node:crypto'
import { readFile, rm } from 'node:fs/promises'
import path from 'node:path'

import { replaceFile, withWikiWriter } from './atomic-files.mjs'
import { assertPlainPath, relativeNote, statIfPresent } from './paths.mjs'

export const MANIFEST = '.wiki-sync-manifest.json'
const PENDING = '.wiki-sync-pending.json'
const generator = 'stream-render-course'
const digest = (value) => createHash('sha256').update(value).digest('hex')

async function readManifest(file) {
  await assertPlainPath(file)
  const info = await statIfPresent(file)
  if (!info) return undefined
  if (!info.isFile() || info.nlink > 1)
    throw new Error('Sync manifest must be a regular file without hard links')
  const contents = await readFile(file, 'utf8')
  let manifest
  try {
    manifest = JSON.parse(contents)
  } catch (error) {
    throw new Error(`Invalid JSON in ${path.basename(file)}; no notes written`, { cause: error })
  }
  if (
    manifest?.version !== 1 ||
    manifest.generator !== generator ||
    !manifest.files ||
    typeof manifest.files !== 'object' ||
    Array.isArray(manifest.files)
  )
    throw new Error('Unrecognized sync manifest; refusing to claim existing files')
  for (const [name, hash] of Object.entries(manifest.files)) {
    relativeNote(name)
    if (typeof hash !== 'string' || !/^[a-f0-9]{64}$/.test(hash))
      throw new Error(`Invalid manifest hash: ${name}`)
  }
  return { contents, files: manifest.files }
}

async function planSync(target, notes, sha) {
  await assertPlainPath(target)
  const manifestPath = path.join(target, MANIFEST)
  const pendingPath = path.join(target, PENDING)
  const [previous, pending] = await Promise.all([
    readManifest(manifestPath),
    readManifest(pendingPath),
  ])
  const incoming = new Map([...notes.entries()].toSorted(([a], [b]) => a.localeCompare(b)))
  for (const name of incoming.keys()) relativeNote(name)
  const files = Object.fromEntries([...incoming].map(([name, content]) => [name, digest(content)]))
  const manifest = JSON.stringify({ version: 1, generator, source_sha: sha, files }, null, 2) + '\n'
  const previousFiles = previous?.files ?? {}
  const unfinished = pending?.contents !== previous?.contents ? pending : undefined
  if (unfinished && unfinished.contents !== manifest) {
    throw new Error(
      'An interrupted wiki sync targets a different version; rerun that source version first',
    )
  }
  const recovering = unfinished?.files ?? {}
  const names = [...new Set([...Object.keys(previousFiles), ...incoming.keys()])]
  // Check every destination before the first write, including source pages that disappeared.
  const plan = await Promise.all(
    names.map(async (name) => {
      const destination = path.join(target, name)
      await assertPlainPath(destination)
      const info = await statIfPresent(destination)
      if (info && (!info.isFile() || info.nlink > 1))
        throw new Error(`Note must be a regular file without hard links: ${name}`)
      const actual = info ? digest(await readFile(destination)) : undefined
      const wanted = incoming.get(name)
      const matches = actual !== undefined && actual === files[name]
      if (actual !== undefined) {
        const managed = Object.hasOwn(previousFiles, name)
        if (!managed && !Object.hasOwn(recovering, name))
          throw new Error(`Unmanaged file conflict: ${name}`)
        if (!matches && (!managed || actual !== previousFiles[name]))
          throw new Error(`Edited generated note conflict: ${name}`)
      }
      const action =
        wanted === undefined
          ? actual === undefined
            ? 'unchanged'
            : 'remove'
          : matches
            ? 'unchanged'
            : 'write'
      return { name, destination, wanted, action }
    }),
  )
  const report = {
    written: plan.filter(({ action }) => action === 'write').length,
    removed: plan.filter(({ action }) => action === 'remove').length,
    unchanged: plan.filter(({ action }) => action === 'unchanged').length,
    manifestChanged: previous?.contents !== manifest,
    source_sha: sha,
  }
  const hasChanges = report.written > 0 || report.removed > 0 || report.manifestChanged
  return { plan, report, hasChanges, manifest, manifestPath, pending, pendingPath }
}

export async function syncNotes(target, notes, { sha, check = false } = {}) {
  const initial = await planSync(target, notes, sha)
  if (check || (!initial.hasChanges && !initial.pending)) return initial.report

  return withWikiWriter(target, async () => {
    const { plan, report, hasChanges, manifest, manifestPath, pending, pendingPath } =
      await planSync(target, notes, sha)
    // Record which new paths passed preflight before publishing any generated note.
    if (hasChanges && pending?.contents !== manifest) await replaceFile(pendingPath, manifest)
    for (const { destination, wanted, action } of plan) {
      // oxlint-disable-next-line no-await-in-loop -- finish each atomic replacement before continuing
      if (action === 'write') await replaceFile(destination, wanted)
      // oxlint-disable-next-line no-await-in-loop -- leave the recovery record until all removals finish
      else if (action === 'remove') await rm(destination, { force: true })
    }
    if (report.manifestChanged) await replaceFile(manifestPath, manifest)
    if (pending || hasChanges) await rm(pendingPath, { force: true })
    return report
  })
}
