import { createHash, randomUUID } from 'node:crypto'
import { mkdir, open, readFile, rm, stat } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'

import { hasFileSystemErrorCode } from './fs-errors'

const LOCK_ROOT = join(tmpdir(), 'guoba-skills-locks')
const RETRY_DELAY_MS = 50
const RETRY_TIMEOUT_MS = 5_000

export async function withFileLock<T>(resource: string, action: () => Promise<T>): Promise<T> {
  await mkdir(LOCK_ROOT, { mode: 0o700, recursive: true })
  const lockPath = fileLockPath(resource)
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
    if (await recoverAbandonedLock(path)) return acquire(path, startedAt)
    if (Date.now() - startedAt >= RETRY_TIMEOUT_MS) {
      throw new Error(`Another Guoba Skills process is writing this resource (${path}).`, {
        cause: error,
      })
    }
    await delay(RETRY_DELAY_MS)
    return acquire(path, startedAt)
  }
}

export function fileLockPath(resource: string): string {
  return join(LOCK_ROOT, `${resourceKey(resource)}.lock`)
}

function resourceKey(resource: string): string {
  return createHash('sha256').update(resolve(resource)).digest('hex')
}

function isAlreadyLocked(error: unknown): boolean {
  return hasFileSystemErrorCode(error, 'EEXIST')
}

async function recoverAbandonedLock(path: string): Promise<boolean> {
  let content: string
  try {
    content = await readFile(path, 'utf8')
  } catch (error) {
    return hasFileSystemErrorCode(error, 'ENOENT')
  }
  const pid = ownerPid(content)
  if (pid && isProcessAlive(pid)) return false
  if (!pid && Date.now() - (await stat(path)).mtimeMs < RETRY_TIMEOUT_MS) return false
  await rm(path, { force: true })
  return true
}

function ownerPid(content: string): number | undefined {
  try {
    const raw: unknown = JSON.parse(content)
    const pid = typeof raw === 'object' && raw !== null ? Reflect.get(raw, 'pid') : undefined
    return typeof pid === 'number' && Number.isInteger(pid) && pid > 0 ? pid : undefined
  } catch {
    return undefined
  }
}

function isProcessAlive(pid: number): boolean {
  try {
    process.kill(pid, 0)
    return true
  } catch (error) {
    return hasFileSystemErrorCode(error, 'EPERM')
  }
}

function delay(milliseconds: number): Promise<void> {
  return new Promise((resolveDelay) => setTimeout(resolveDelay, milliseconds))
}
