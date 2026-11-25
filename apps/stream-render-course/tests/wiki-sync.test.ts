import { execFileSync } from 'node:child_process'
import { link, mkdtemp, mkdir, readFile, realpath, rm, symlink, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'

import { afterEach, describe, expect, it } from 'vitest'

import { convertMarkdown, readTitle } from '../scripts/wiki-sync/markdown.mjs'
import { collectNotes } from '../scripts/wiki-sync/notes.mjs'
import { relativeNote, resolveVaultTarget } from '../scripts/wiki-sync/paths.mjs'
import { sourceVersion } from '../scripts/wiki-sync/source.mjs'
import { MANIFEST, syncNotes } from '../scripts/wiki-sync/write.mjs'

const temporary: string[] = []
const sha = 'a'.repeat(40)
const context = {
  prefix: 'agent-wiki/streaming',
  sha,
  date: '2026-10-13',
  repository: 'https://github.com/example/course',
}
async function directory() {
  const root = await realpath(await mkdtemp(path.join(tmpdir(), 'wiki-sync-')))
  temporary.push(root)
  return root
}
afterEach(async () => {
  await Promise.all(temporary.splice(0).map((root) => rm(root, { recursive: true, force: true })))
})

async function sourcePage(course: string, name: string, title: string, markdown: string) {
  await Promise.all([
    mkdir(path.dirname(path.join(course, 'docs', name)), { recursive: true }),
    mkdir(path.dirname(path.join(course, 'doc_build', name)), { recursive: true }),
  ])
  await Promise.all([
    writeFile(
      path.join(course, 'docs', `${name}.mdx`),
      `---\ntitle: ${title}\ndescription: fixture\n---\n# Source\n`,
    ),
    writeFile(path.join(course, 'doc_build', `${name}.md`), markdown),
  ])
}
async function courseFixture() {
  const course = path.join(await directory(), 'course')
  await sourcePage(course, 'index', '课程首页', '# 首页\n[课程](/learn/00-start.md)\n')
  await sourcePage(course, 'setup', '环境安装', '# 环境\n')
  await sourcePage(course, 'learn/00-start', '00 · 开始', '# 开始\n[首页](/index.md)\n')
  await writeFile(path.join(course, 'docs/learn/_meta.json'), JSON.stringify(['00-start']))
  return course
}

describe('Markdown export', () => {
  it('rewrites course links while preserving external experiments and exact code fences', () => {
    const routes = new Map([['/learn/a', 'learn/a.md']])
    const code = '```md\n[example](/learn/a.md)\n\n> For AI agents: code, not a banner\n```\n'
    const source =
      '> For AI agents: generated banner\n\n[课程\n](/learn/a.md)\n' +
      code +
      '[实验\n](http://localhost:5174/project?source=mine)\n`[literal](/learn/a.md)`\n'
    const result = convertMarkdown(source, routes, context.prefix)
    expect(result).toContain('[[agent-wiki/streaming/learn/a|课程]]')
    expect(result).toContain(code)
    expect(result).toContain('[实验](http://localhost:5174/project?source=mine)')
    expect(result).toContain('`[literal](/learn/a.md)`')
    expect(result).not.toContain('generated banner')
  })
  it('preserves long and tilde fences, including shorter backticks in the body', () => {
    const code =
      '````markdown\n```\n[code](/missing.md)\n```\n````\n~~~text\n[also code](/missing.md)\n~~~\n'
    expect(convertMarkdown(code, new Map(), context.prefix)).toBe(code)
    expect(() => convertMarkdown('[broken](/missing.md)', new Map(), context.prefix)).toThrow(
      'Unresolved',
    )
  })
  it('preserves equal-delimiter inline code and container fences', () => {
    const source =
      'Use ``literal ` [lesson](/missing.md)`` safely.\n' +
      '- Example:\n    ~~~md\n    [inside list](/missing.md)\n    ~~~\n' +
      '> ```md\n> `\n> [inside quote](/missing.md)\n> ```\n'
    expect(convertMarkdown(source, new Map(), context.prefix)).toBe(source)
  })
  it('keeps frontmatter titles as text', () => {
    expect(readTitle('---\ntitle: 00 · 开始\n---\n')).toBe('00 · 开始')
    expect(readTitle('---\ntitle: "A1: HTTP"\n---\n')).toBe('A1: HTTP')
  })
  it('exports source pages and ordered README, ignoring stale built pages', async () => {
    const course = await courseFixture()
    await writeFile(path.join(course, 'doc_build/removed.md'), '# stale')
    const notes = await collectNotes(course, context)
    expect([...notes.keys()]).toEqual(['index.md', 'learn/00-start.md', 'setup.md', 'README.md'])
    expect(notes.get('learn/00-start.md')).toContain('[[agent-wiki/streaming/index|首页]]')
    expect(notes.get('README.md')).toContain('[[agent-wiki/streaming/learn/00-start|00 · 开始]]')
    expect(notes.get('index.md')).toContain(`source_sha: "${sha}"`)
    expect(notes.get('index.md')).toContain(`/blob/${sha}/apps/stream-render-course/docs/index.mdx`)
  })
})

describe('managed wiki files', () => {
  it('is idempotent and leaves personal notes unchanged', async () => {
    const target = await directory()
    await writeFile(path.join(target, 'my-notes.md'), '# Personal')
    const notes = new Map([['learn/a.md', '# A\n']])
    expect(await syncNotes(target, notes, { sha })).toMatchObject({ written: 1, removed: 0 })
    const before = await readFile(path.join(target, MANIFEST), 'utf8')
    expect(await syncNotes(target, notes, { sha })).toMatchObject({
      written: 0,
      removed: 0,
      unchanged: 1,
      manifestChanged: false,
    })
    expect(await readFile(path.join(target, MANIFEST), 'utf8')).toBe(before)
    expect(await readFile(path.join(target, 'my-notes.md'), 'utf8')).toBe('# Personal')
  })
  it('checks all unmanaged and edited-note conflicts before writing anything', async () => {
    const target = await directory()
    await syncNotes(
      target,
      new Map([
        ['a.md', '# A'],
        ['b.md', '# B'],
      ]),
      { sha },
    )
    await writeFile(path.join(target, 'b.md'), '# My edit')
    await expect(
      syncNotes(
        target,
        new Map([
          ['a.md', '# Changed'],
          ['b.md', '# Updated'],
        ]),
        { sha },
      ),
    ).rejects.toThrow('Edited generated note')
    expect(await readFile(path.join(target, 'a.md'), 'utf8')).toBe('# A')
    await writeFile(path.join(target, 'b.md'), '# B')
    await writeFile(path.join(target, 'new.md'), '# User-created')
    await expect(
      syncNotes(
        target,
        new Map([
          ['a.md', '# Changed'],
          ['b.md', '# B'],
          ['new.md', '# Generated'],
        ]),
        { sha },
      ),
    ).rejects.toThrow('Unmanaged file conflict')
    expect(await readFile(path.join(target, 'a.md'), 'utf8')).toBe('# A')
  })
  it('adds and removes source pages using the manifest, not the whole target directory', async () => {
    const course = await courseFixture()
    const target = await directory()
    await syncNotes(target, await collectNotes(course, context), { sha })
    await sourcePage(course, 'reference/new', '参考', '# New')
    await writeFile(path.join(target, 'private.md'), '# Personal')
    expect(await syncNotes(target, await collectNotes(course, context), { sha })).toMatchObject({
      written: 2,
      removed: 0,
    })
    await rm(path.join(course, 'docs/reference/new.mdx'))
    expect(await syncNotes(target, await collectNotes(course, context), { sha })).toMatchObject({
      removed: 1,
    })
    await expect(readFile(path.join(target, 'reference/new.md'))).rejects.toMatchObject({
      code: 'ENOENT',
    })
    expect(await readFile(path.join(target, 'private.md'), 'utf8')).toBe('# Personal')
  })
  it('protects edited generated pages even when the source page is deleted', async () => {
    const target = await directory()
    await syncNotes(target, new Map([['old.md', '# Old']]), { sha })
    await writeFile(path.join(target, 'old.md'), '# Personal edit')
    await expect(syncNotes(target, new Map([['new.md', '# New']]), { sha })).rejects.toThrow(
      'Edited generated note',
    )
    await expect(readFile(path.join(target, 'new.md'))).rejects.toMatchObject({ code: 'ENOENT' })
  })
  it('checks differences without creating or updating target notes', async () => {
    const target = path.join(await directory(), 'not-created')
    expect(await syncNotes(target, new Map([['a.md', '# A']]), { sha, check: true })).toMatchObject(
      { written: 1, manifestChanged: true },
    )
    await expect(readFile(path.join(target, MANIFEST))).rejects.toMatchObject({ code: 'ENOENT' })
  })
  it('refuses hard-linked notes so updates cannot change another file outside the target', async () => {
    const target = await directory()
    const outside = path.join(await directory(), 'private.md')
    await syncNotes(target, new Map([['a.md', '# A']]), { sha })
    await link(path.join(target, 'a.md'), outside)
    await expect(syncNotes(target, new Map([['a.md', '# Changed']]), { sha })).rejects.toThrow(
      'hard links',
    )
    expect(await readFile(outside, 'utf8')).toBe('# A')
  })
})

describe('path and version boundaries', () => {
  it('uses the full vault-relative path and refuses a missing vault or the vault root', async () => {
    const vault = await directory()
    await expect(resolveVaultTarget(path.join(vault, 'course'))).rejects.toThrow('No .obsidian')
    await mkdir(path.join(vault, '.obsidian'))
    expect(await resolveVaultTarget(path.join(vault, 'agent-wiki/streaming'))).toEqual({
      target: path.join(vault, 'agent-wiki/streaming'),
      prefix: 'agent-wiki/streaming',
    })
    await expect(resolveVaultTarget(vault)).rejects.toThrow('dedicated subdirectory')
  })
  it('rejects traversal in incoming and manifest paths', async () => {
    for (const file of ['../escape.md', '/absolute.md', 'a/../../escape.md', 'a\\escape.md']) {
      expect(() => relativeNote(file)).toThrow('Unsafe note path')
    }
    const target = await directory()
    await writeFile(
      path.join(target, MANIFEST),
      JSON.stringify({
        version: 1,
        generator: 'stream-render-course',
        files: { '../escape.md': 'a'.repeat(64) },
      }),
    )
    await expect(syncNotes(target, new Map([['a.md', '# A']]), { sha })).rejects.toThrow(
      'Unsafe note path',
    )
  })
  it('refuses note, directory and manifest symlinks without following them', async () => {
    const target = await directory()
    const outside = await directory()
    await writeFile(path.join(outside, 'a.md'), '# Outside')
    await symlink(outside, path.join(target, 'learn'))
    await expect(
      syncNotes(target, new Map([['learn/a.md', '# Replace']]), { sha }),
    ).rejects.toThrow('symbolic link')
    await symlink(path.join(outside, 'a.md'), path.join(target, 'a.md'))
    await expect(syncNotes(target, new Map([['a.md', '# Replace']]), { sha })).rejects.toThrow(
      'symbolic link',
    )
    await symlink(path.join(outside, 'a.md'), path.join(target, MANIFEST))
    await expect(syncNotes(target, new Map(), { sha })).rejects.toThrow('symbolic link')
    expect(await readFile(path.join(outside, 'a.md'), 'utf8')).toBe('# Outside')
  })
  it('rejects dirty shared contracts before attaching a source SHA', async () => {
    const root = await directory()
    const course = path.join(root, 'apps/stream-render-course')
    await mkdir(course, { recursive: true })
    await mkdir(path.join(root, 'packages/stream-render-contract'), { recursive: true })
    const contract = path.join(root, 'packages/stream-render-contract/index.ts')
    await writeFile(contract, 'export const version = 1\n')
    const git = (...args: string[]) =>
      execFileSync('git', args, {
        cwd: root,
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'pipe'],
      }).trim()
    git('init')
    git('remote', 'add', 'origin', 'git@github.com:example/course.git')
    git('add', '.')
    git(
      '-c',
      'user.name=Wiki Sync Test',
      '-c',
      'user.email=wiki-sync@example.test',
      'commit',
      '--no-gpg-sign',
      '-m',
      'Test fixture',
    )
    expect(sourceVersion(course).repository).toBe('https://github.com/example/course')
    await writeFile(contract, 'export const version = 2\n')
    expect(() => sourceVersion(course)).toThrow('working tree is dirty')
  })
})
