import { createHash, randomUUID } from 'node:crypto'
import { mkdir, open, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'

const LOCK_ROOT = join(tmpdir(), 'guoba-skills-locks')
const RETRY_DELAY_MS = 50
const RETRY_TIMEOUT_MS = 5_000

export async function withFileLock<T>(resource: string, action: () => Promise<T>): Promise<T> {
  await mkdir(LOCK_ROOT, { mode: 0o700, recursive: true })
  const lockPath = join(LOCK_ROOT, `${resourceKey(resource)}.lock`)
  const startedAt = Date.now()
  const handle = await acquire(lockPath, startedAt)
  try {
    await handle.writeFile(`${JSON.stringify({ pid: process.pid, owner: randomUUID() })}\n`)
    return await action()
  } finally {
    await handle.close()
    await rm(lockPath, { force: true })
  }
}

async function acquire(path: string, startedAt: number): ReturnType<typeof open> {
  try {
    return await open(path, 'wx', 0o600)
  } catch (error) {
    if (!isAlreadyLocked(error)) throw error
    if (Date.now() - startedAt >= RETRY_TIMEOUT_MS) {
      throw new Error(`Another Guoba Skills process is writing this resource (${path}).`, {
        cause: error,
      })
    }
    await delay(RETRY_DELAY_MS)
    return acquire(path, startedAt)
  }
}

function resourceKey(resource: string): string {
  return createHash('sha256').update(resolve(resource)).digest('hex')
}

function isAlreadyLocked(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === 'EEXIST'
}

function delay(milliseconds: number): Promise<void> {
  return new Promise((resolveDelay) => setTimeout(resolveDelay, milliseconds))
}
