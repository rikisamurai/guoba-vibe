import { TextDecoder } from 'node:util'

import { formatPatch, structuredPatch } from 'diff'

import type { FileChange } from '../shared/types'
import type { SkillContentManifest, SkillManifestEntry } from './content-manifest'

export interface SkillFileDiff {
  path: string
  binary: boolean
  patch?: string
  summary?: string
}

export interface SkillDiff {
  added: SkillFileDiff[]
  removed: SkillFileDiff[]
  modified: SkillFileDiff[]
}

const decoder = new TextDecoder('utf-8', { fatal: true })

function decodeText(content: Uint8Array): string | null {
  if (content.includes(0)) return null
  try {
    return decoder.decode(content)
  } catch {
    return null
  }
}

function fileMode(executable: boolean): string {
  return executable ? '100755' : '100644'
}

function textPatch(
  path: string,
  oldEntry: SkillManifestEntry | undefined,
  newEntry: SkillManifestEntry | undefined,
  oldText: string,
  newText: string,
): string {
  const patch = structuredPatch(
    oldEntry ? `a/${path}` : '/dev/null',
    newEntry ? `b/${path}` : '/dev/null',
    oldText,
    newText,
    undefined,
    undefined,
    { context: 3 },
  )
  patch.isGit = true
  if (!oldEntry && newEntry) {
    patch.isCreate = true
    patch.newMode = fileMode(newEntry.executable)
  } else if (oldEntry && !newEntry) {
    patch.isDelete = true
    patch.oldMode = fileMode(oldEntry.executable)
  } else if (oldEntry && newEntry && oldEntry.executable !== newEntry.executable) {
    patch.oldMode = fileMode(oldEntry.executable)
    patch.newMode = fileMode(newEntry.executable)
  }
  return formatPatch(patch)
}

function sameContent(left: SkillManifestEntry, right: SkillManifestEntry): boolean {
  return Buffer.from(left.content).equals(Buffer.from(right.content))
}

function binarySummary(
  oldEntry: SkillManifestEntry | undefined,
  newEntry: SkillManifestEntry | undefined,
): string {
  if (!oldEntry) return `Binary file added (${newEntry?.content.byteLength ?? 0} bytes)`
  if (!newEntry) return `Binary file removed (${oldEntry.content.byteLength} bytes)`
  if (sameContent(oldEntry, newEntry)) {
    return `Binary file mode changed (${fileMode(oldEntry.executable)} -> ${fileMode(newEntry.executable)})`
  }
  return `Binary file changed (${oldEntry.content.byteLength} -> ${newEntry.content.byteLength} bytes)`
}

function fileDiff(
  path: string,
  oldEntry?: SkillManifestEntry,
  newEntry?: SkillManifestEntry,
): SkillFileDiff {
  const oldText = oldEntry ? decodeText(oldEntry.content) : ''
  const newText = newEntry ? decodeText(newEntry.content) : ''
  const base = {
    path,
  }
  if (oldText === null || newText === null) {
    return { ...base, binary: true, summary: binarySummary(oldEntry, newEntry) }
  }
  return {
    ...base,
    binary: false,
    patch: textPatch(path, oldEntry, newEntry, oldText, newText),
  }
}

export function diffSkillManifests(
  oldManifest: SkillContentManifest,
  newManifest: SkillContentManifest,
): SkillDiff {
  const oldEntries = new Map(oldManifest.entries.map((entry) => [entry.path, entry]))
  const newEntries = new Map(newManifest.entries.map((entry) => [entry.path, entry]))
  const paths = [...new Set([...oldEntries.keys(), ...newEntries.keys()])].toSorted()
  const result: SkillDiff = { added: [], removed: [], modified: [] }

  for (const path of paths) {
    const oldEntry = oldEntries.get(path)
    const newEntry = newEntries.get(path)
    if (!oldEntry) result.added.push(fileDiff(path, undefined, newEntry))
    else if (!newEntry) result.removed.push(fileDiff(path, oldEntry))
    else if (!sameContent(oldEntry, newEntry) || oldEntry.executable !== newEntry.executable) {
      result.modified.push(fileDiff(path, oldEntry, newEntry))
    }
  }
  return result
}

export function flattenSkillDiff(diff: SkillDiff): FileChange[] {
  return [
    ...diff.added.map(toChange('added')),
    ...diff.removed.map(toChange('removed')),
    ...diff.modified.map(toChange('modified')),
  ]
}

function toChange(kind: FileChange['kind']) {
  return (file: SkillFileDiff): FileChange => ({
    path: file.path,
    kind,
    binary: file.binary,
    patch: file.patch ?? file.summary,
  })
}
