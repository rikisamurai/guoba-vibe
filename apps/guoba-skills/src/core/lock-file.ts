import { randomUUID } from 'node:crypto'
import { mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises'
import { dirname, posix } from 'node:path'

import { z } from 'zod'

import type { SkillProvenance } from '../shared/types'
import { withFileLock } from './file-lock'
import { isMissingPathError } from './fs-errors'

interface LockFile {
  version: number
  skills: Record<string, SkillProvenance>
}

const EMPTY_LOCK: LockFile = { version: 2, skills: {} }

const provenanceSchema = z
  .object({
    source: z.string(),
    sourceType: z.enum(['github', 'git', 'local']),
    skillPath: z.string(),
    computedHash: z.string().optional(),
    sourceUrl: z.string().optional(),
    branch: z.string().nullable().optional(),
    requestedRef: z.string().optional(),
    refPolicy: z.enum(['explicit', 'captured-default']).optional(),
    revision: z.string().optional(),
    treeHash: z.string().optional(),
    contentHash: z.string().optional(),
    hashProfile: z.literal('guoba-skill-v1').optional(),
    catalog: z
      .object({ provider: z.literal('skills.sh'), id: z.string(), detailUrl: z.string() })
      .optional(),
    installedAt: z.string().optional(),
    updatedAt: z.string().optional(),
    lastChecked: z
      .object({
        at: z.string(),
        revision: z.string().optional(),
        treeHash: z.string().optional(),
        contentHash: z.string().optional(),
      })
      .optional(),
  })
  .passthrough()

const lockSchema = z.object({
  version: z.number().optional().default(1),
  skills: z.record(z.string(), provenanceSchema).optional().default({}),
})

export async function readLockFile(path: string): Promise<LockFile> {
  try {
    const raw: unknown = JSON.parse(await readFile(path, 'utf8'))
    const parsed = lockSchema.parse(raw)
    return {
      version: parsed.version,
      skills: Object.fromEntries(
        Object.entries(parsed.skills).map(([name, entry]) => [name, normalizeEntry(entry)]),
      ),
    }
  } catch (error) {
    if (isMissingPathError(error)) return structuredClone(EMPTY_LOCK)
    throw new Error(`Could not read ${path}: ${messageOf(error)}`, { cause: error })
  }
}

export async function writeLockFile(path: string, lock: LockFile): Promise<void> {
  await mkdir(dirname(path), { recursive: true })
  const temporary = `${path}.tmp-${process.pid}-${randomUUID()}`
  try {
    await writeFile(temporary, `${JSON.stringify({ ...lock, version: 2 }, null, 2)}\n`, 'utf8')
    await rename(temporary, path)
  } catch (error) {
    await rm(temporary, { force: true })
    throw error
  }
}

export async function setLockEntry(
  path: string,
  name: string,
  entry: SkillProvenance,
): Promise<void> {
  await withFileLock(path, async () => {
    const lock = await readLockFile(path)
    lock.skills[name] = entry
    await writeLockFile(path, lock)
  })
}

function normalizeEntry(entry: SkillProvenance): SkillProvenance {
  const skillPath = entry.skillPath || 'SKILL.md'
  const sourceUrl = entry.sourceUrl ?? githubUrl(entry.source, entry.sourceType)
  return {
    ...entry,
    skillPath: posix.normalize(skillPath.replaceAll('\\', '/')),
    sourceUrl,
    contentHash: entry.contentHash,
    hashProfile: entry.hashProfile,
  }
}

function githubUrl(source: string, type: string): string | undefined {
  return type === 'github' && /^[\w.-]+\/[\w.-]+$/u.test(source)
    ? `https://github.com/${source}.git`
    : undefined
}

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}
