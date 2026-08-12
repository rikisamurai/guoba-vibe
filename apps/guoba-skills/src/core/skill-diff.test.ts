import { describe, expect, it } from 'vitest'

import {
  SKILL_HASH_PROFILE,
  hashContentManifest,
  type SkillContentManifest,
  type SkillManifestEntry,
} from './content-manifest'
import { diffSkillManifests } from './skill-diff'

interface EntryInput {
  path: string
  content: string | Uint8Array
  executable?: boolean
}

function manifest(inputs: EntryInput[]): SkillContentManifest {
  const entries: SkillManifestEntry[] = inputs.map((input) => ({
    path: input.path,
    content: typeof input.content === 'string' ? Buffer.from(input.content) : input.content,
    executable: input.executable ?? false,
  }))
  return {
    profile: SKILL_HASH_PROFILE,
    entries,
    contentHash: hashContentManifest(entries),
  }
}

describe('diffSkillManifests', () => {
  it('classifies added, removed, and modified files in stable path order', () => {
    const oldManifest = manifest([
      { path: 'z-removed.md', content: 'remove\n' },
      { path: 'nested/changed.md', content: 'before\n' },
      { path: 'same.md', content: 'same\n' },
    ])
    const newManifest = manifest([
      { path: 'b-added.md', content: 'b\n' },
      { path: 'a-added.md', content: 'a\n' },
      { path: 'nested/changed.md', content: 'after\n' },
      { path: 'same.md', content: 'same\n' },
    ])

    const result = diffSkillManifests(oldManifest, newManifest)

    expect(result.added.map(({ path }) => path)).toEqual(['a-added.md', 'b-added.md'])
    expect(result.removed.map(({ path }) => path)).toEqual(['z-removed.md'])
    expect(result.modified.map(({ path }) => path)).toEqual(['nested/changed.md'])
  })

  it('returns a unified text patch for modified files', () => {
    const oldManifest = manifest([{ path: 'note.md', content: 'one\ntwo\nthree\n' }])
    const newManifest = manifest([{ path: 'note.md', content: 'one\nTWO\nthree\n' }])

    const [change] = diffSkillManifests(oldManifest, newManifest).modified

    expect(change?.binary).toBe(false)
    expect(change?.summary).toBeUndefined()
    expect(change?.patch).toBe(
      [
        'diff --git a/note.md b/note.md',
        '--- a/note.md',
        '+++ b/note.md',
        '@@ -1,3 +1,3 @@',
        ' one',
        '-two',
        '+TWO',
        ' three',
        '',
      ].join('\n'),
    )
  })

  it('uses /dev/null in patches for added and removed text files', () => {
    const added = diffSkillManifests(
      manifest([]),
      manifest([{ path: 'added.md', content: 'hello\n' }]),
    ).added[0]
    const removed = diffSkillManifests(
      manifest([{ path: 'removed.md', content: 'bye\n' }]),
      manifest([]),
    ).removed[0]

    expect(added?.patch).toContain('--- /dev/null\n+++ b/added.md\n@@ -0,0 +1,1 @@\n+hello\n')
    expect(removed?.patch).toContain('--- a/removed.md\n+++ /dev/null\n@@ -1,1 +0,0 @@\n-bye\n')
  })

  it('represents executable-bit changes as modified text patches', () => {
    const oldManifest = manifest([{ path: 'run.sh', content: '#!/bin/sh\n', executable: false }])
    const newManifest = manifest([{ path: 'run.sh', content: '#!/bin/sh\n', executable: true }])

    const result = diffSkillManifests(oldManifest, newManifest)

    expect(result.modified).toHaveLength(1)
    expect(result.modified[0]?.patch).toBe(
      ['diff --git a/run.sh b/run.sh', 'old mode 100644', 'new mode 100755', ''].join('\n'),
    )
  })

  it('detects final-newline-only text changes', () => {
    const oldManifest = manifest([{ path: 'note.md', content: 'line\n' }])
    const newManifest = manifest([{ path: 'note.md', content: 'line' }])

    const [change] = diffSkillManifests(oldManifest, newManifest).modified

    expect(change?.patch).toContain('@@ -1,1 +1,1 @@\n-line\n+line\n\\ No newline at end of file\n')
  })

  it('returns only a summary for NUL-containing binary files', () => {
    const oldManifest = manifest([{ path: 'asset.bin', content: Uint8Array.from([0, 1, 2]) }])
    const newManifest = manifest([{ path: 'asset.bin', content: Uint8Array.from([0, 1, 2, 3]) }])

    const [change] = diffSkillManifests(oldManifest, newManifest).modified

    expect(change?.binary).toBe(true)
    expect(change?.patch).toBeUndefined()
    expect(change?.summary).toBe('Binary file changed (3 -> 4 bytes)')
  })

  it('treats invalid UTF-8 as binary and summarizes additions', () => {
    const binary = Uint8Array.from([0xc3, 0x28])

    const [change] = diffSkillManifests(
      manifest([]),
      manifest([{ path: 'invalid.bin', content: binary }]),
    ).added

    expect(change?.binary).toBe(true)
    expect(change?.patch).toBeUndefined()
    expect(change?.summary).toBe('Binary file added (2 bytes)')
  })

  it('returns no changes for identical manifests', () => {
    const before = manifest([{ path: 'SKILL.md', content: '# Skill\n' }])
    const after = manifest([{ path: 'SKILL.md', content: '# Skill\n' }])

    expect(diffSkillManifests(before, after)).toEqual({
      added: [],
      removed: [],
      modified: [],
    })
  })
})
