import { lstat, realpath } from 'node:fs/promises'
import path from 'node:path'

const unsafeCharacters = (value) =>
  [...value].some((char) => '\\[]|#'.includes(char) || char.charCodeAt(0) < 32)

export function relativeNote(file) {
  if (
    typeof file !== 'string' ||
    !file.endsWith('.md') ||
    unsafeCharacters(file) ||
    path.posix.isAbsolute(file) ||
    file.split('/').some((part) => !part || part === '.' || part === '..')
  )
    throw new Error(`Unsafe note path: ${String(file)}`)
  return file
}

export async function statIfPresent(file) {
  try {
    return await lstat(file)
  } catch (error) {
    if (error.code === 'ENOENT') return undefined
    throw error
  }
}

export async function assertPlainPath(file) {
  const resolved = path.resolve(file)
  const root = path.parse(resolved).root
  const parts = resolved.slice(root.length).split(path.sep)
  let current = root
  for (const part of parts) {
    current = path.join(current, part)
    // oxlint-disable-next-line no-await-in-loop -- validate each ancestor before descending
    const info = await statIfPresent(current)
    if (!info) return
    if (info.isSymbolicLink()) throw new Error(`Refusing symbolic link: ${current}`)
    if (current !== resolved && !info.isDirectory()) throw new Error(`Not a directory: ${current}`)
  }
}

export async function resolveVaultTarget(target) {
  if (!path.isAbsolute(target))
    throw new Error('--target must be an absolute path inside an Obsidian vault')
  const output = path.resolve(target)
  await assertPlainPath(output)
  let candidate = output
  while (true) {
    // oxlint-disable-next-line no-await-in-loop -- nearest vault owns internal link paths
    const marker = await statIfPresent(path.join(candidate, '.obsidian'))
    if (marker?.isDirectory()) {
      // oxlint-disable-next-line no-await-in-loop -- resolve only the nearest discovered vault
      const vault = await realpath(candidate)
      const prefix = path.relative(vault, output).split(path.sep).join('/')
      if (!prefix || prefix.startsWith('../'))
        throw new Error('Use a dedicated subdirectory inside the vault')
      if (unsafeCharacters(prefix))
        throw new Error('Target path contains unsupported wikilink characters')
      return { target: output, prefix }
    }
    const parent = path.dirname(candidate)
    if (parent === candidate)
      throw new Error('No .obsidian vault found above --target; no files written')
    candidate = parent
  }
}
