import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

import { collectNotes } from './wiki-sync/notes.mjs'
import { resolveVaultTarget } from './wiki-sync/paths.mjs'
import { sourceVersion } from './wiki-sync/source.mjs'
import { syncNotes } from './wiki-sync/write.mjs'

const args = process.argv.slice(2).filter((arg) => arg !== '--')
if (args.includes('--help')) {
  console.log(
    'Usage: pnpm --filter stream-render-course sync:wiki --target /absolute/vault/course-directory [--check]',
  )
  console.log(
    'Builds fresh Markdown. --check reports differences without changing wiki files; dirty course sources are rejected.',
  )
} else {
  try {
    const position = args.indexOf('--target')
    const target = position >= 0 ? args[position + 1] : undefined
    const remaining = args.filter((_, index) => index !== position && index !== position + 1)
    if (!target || remaining.some((arg) => arg !== '--check'))
      throw new Error('Expected --target /absolute/vault/course-directory [--check]')
    const course = fileURLToPath(new URL('../', import.meta.url)).replace(/\/$/, '')
    const destination = await resolveVaultTarget(target)
    const version = sourceVersion(course)
    execFileSync('pnpm', ['build'], {
      cwd: course,
      stdio: 'inherit',
      env: { ...process.env, PUBLIC_LAB_ORIGIN: 'http://localhost:5174' },
    })
    // Detect source changes during the build before assigning its commit identity.
    if (sourceVersion(course).sha !== version.sha)
      throw new Error('Source commit changed while building; retry sync')
    const notes = await collectNotes(course, { ...version, prefix: destination.prefix })
    const result = await syncNotes(destination.target, notes, {
      sha: version.sha,
      check: remaining.includes('--check'),
    })
    console.log(
      JSON.stringify({ target: destination.target, notes: notes.size, ...result }, null, 2),
    )
    if (
      remaining.includes('--check') &&
      (result.written || result.removed || result.manifestChanged)
    )
      process.exitCode = 1
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error))
    process.exitCode = 1
  }
}
