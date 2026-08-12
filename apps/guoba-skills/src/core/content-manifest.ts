import { createHash } from 'node:crypto'
import { lstat, readFile, readdir } from 'node:fs/promises'
import { join } from 'node:path'

export const SKILL_HASH_PROFILE = 'guoba-skill-v1' as const

export type SkillContentHash = `sha256:${string}`

export interface SkillManifestEntry {
  path: string
  content: Uint8Array
  executable: boolean
}

export interface SkillContentManifest {
  profile: typeof SKILL_HASH_PROFILE
  entries: SkillManifestEntry[]
  contentHash: SkillContentHash
}

export class UnsupportedSkillEntryError extends Error {
  readonly relativePath: string

  constructor(relativePath: string, reason: string) {
    super(`Unsupported skill entry "${relativePath}": ${reason}`)
    this.name = 'UnsupportedSkillEntryError'
    this.relativePath = relativePath
  }
}

const IGNORED_NAMES = new Set(['.git', '.DS_Store', 'Thumbs.db', '__pycache__'])

function comparePaths(left: string, right: string): number {
  if (left === right) return 0
  return left < right ? -1 : 1
}

function isIgnored(name: string): boolean {
  return IGNORED_NAMES.has(name) || name.endsWith('.pyc')
}

async function collectEntries(
  absoluteDirectory: string,
  relativeDirectory: string,
): Promise<SkillManifestEntry[]> {
  const directoryEntries = await readdir(absoluteDirectory, {
    withFileTypes: true,
  })
  const sortedEntries = directoryEntries.toSorted((left, right) =>
    comparePaths(left.name, right.name),
  )
  const entryGroups = await Promise.all(
    sortedEntries.map(async (directoryEntry) => {
      const relativePath = relativeDirectory
        ? `${relativeDirectory}/${directoryEntry.name}`
        : directoryEntry.name
      const absolutePath = join(absoluteDirectory, directoryEntry.name)
      const stats = await lstat(absolutePath)

      if (stats.isSymbolicLink()) {
        throw new UnsupportedSkillEntryError(relativePath, 'symbolic links are not allowed')
      }
      if (isIgnored(directoryEntry.name)) return []
      if (stats.isDirectory()) {
        return collectEntries(absolutePath, relativePath)
      }
      if (!stats.isFile()) {
        throw new UnsupportedSkillEntryError(relativePath, 'only regular files are allowed')
      }

      return [
        {
          path: relativePath,
          content: await readFile(absolutePath),
          executable: (stats.mode & 0o111) !== 0,
        },
      ]
    }),
  )

  return entryGroups.flat()
}

function validateManifestPath(relativePath: string): void {
  const segments = relativePath.split('/')
  if (
    !relativePath ||
    relativePath.startsWith('/') ||
    relativePath.includes('\\') ||
    segments.includes('.') ||
    segments.includes('..')
  ) {
    throw new Error(`Invalid skill manifest path: "${relativePath}"`)
  }
}

function lengthPrefix(length: number): Buffer {
  const prefix = Buffer.alloc(8)
  prefix.writeBigUInt64BE(BigInt(length))
  return prefix
}

function updateFramed(hash: ReturnType<typeof createHash>, value: Uint8Array): void {
  hash.update(lengthPrefix(value.byteLength))
  hash.update(value)
}

export function hashContentManifest(entries: readonly SkillManifestEntry[]): SkillContentHash {
  const hash = createHash('sha256')
  const sortedEntries = entries.toSorted((left, right) => comparePaths(left.path, right.path))

  updateFramed(hash, Buffer.from(SKILL_HASH_PROFILE))
  hash.update(lengthPrefix(sortedEntries.length))
  for (const entry of sortedEntries) {
    validateManifestPath(entry.path)
    updateFramed(hash, Buffer.from(entry.path))
    updateFramed(hash, entry.content)
    hash.update(Buffer.from([entry.executable ? 1 : 0]))
  }

  return `sha256:${hash.digest('hex')}`
}

export async function buildContentManifest(rootDirectory: string): Promise<SkillContentManifest> {
  const rootStats = await lstat(rootDirectory)
  if (rootStats.isSymbolicLink()) {
    throw new UnsupportedSkillEntryError('.', 'symbolic links are not allowed')
  }
  if (!rootStats.isDirectory()) {
    throw new UnsupportedSkillEntryError('.', 'skill root must be a directory')
  }

  const entries = (await collectEntries(rootDirectory, '')).toSorted((left, right) =>
    comparePaths(left.path, right.path),
  )

  return {
    profile: SKILL_HASH_PROFILE,
    entries,
    contentHash: hashContentManifest(entries),
  }
}
