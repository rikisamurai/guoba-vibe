import { createHash, randomUUID } from 'node:crypto'
import { mkdir, readFile, readdir, rename, rmdir, stat, unlink, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { canonicalResourcePath } from './canonical-resource'
import { hasFileSystemErrorCode } from './fs-errors'
import { currentProcessOwner, matchesProcessOwner, parseProcessOwner } from './process-owner'

const LOCK_ROOT = join(tmpdir(), 'guoba-skills-locks')
const RETRY_DELAY_MS = 50
const RETRY_TIMEOUT_MS = 5_000

interface LockOwner {
  directory: string
  path: string
}

interface LockCandidate extends LockOwner {
  name: string
}

export async function withFileLock<T>(resource: string, action: () => Promise<T>): Promise<T> {
  await mkdir(LOCK_ROOT, { mode: 0o700, recursive: true })
  const owner = await acquire(await fileLockPath(resource), Date.now())
  try {
    return await action()
  } finally {
    await release(owner)
  }
}

async function acquire(directory: string, startedAt: number): Promise<LockOwner> {
  const candidate = await createCandidate(directory)
  try {
    await rename(candidate.directory, directory)
    return { directory, path: join(directory, candidate.name) }
  } catch (error) {
    await discardCandidate(candidate)
    if (!hasFileSystemErrorCode(error, 'EEXIST') && !hasFileSystemErrorCode(error, 'ENOTEMPTY')) {
      throw error
    }
    if (await recoverAbandonedOwners(directory)) return acquire(directory, startedAt)
    if (Date.now() - startedAt >= RETRY_TIMEOUT_MS) {
      throw new Error(`Another Guoba Skills process is writing this resource (${directory}).`, {
        cause: error,
      })
    }
    await delay(RETRY_DELAY_MS)
    return acquire(directory, startedAt)
  }
}

async function createCandidate(directory: string): Promise<LockCandidate> {
  const processOwner = await currentProcessOwner()
  const id = randomUUID()
  const candidateDirectory = `${directory}.candidate-${process.pid}-${id}`
  const name = `owner-${process.pid}-${id}.json`
  const path = join(candidateDirectory, name)
  await mkdir(candidateDirectory, { mode: 0o700 })
  try {
    await writeFile(path, `${JSON.stringify(processOwner)}\n`, {
      flag: 'wx',
      mode: 0o600,
    })
    return { directory: candidateDirectory, name, path }
  } catch (error) {
    await removeObservedOwner(path)
    await removeEmptyDirectory(candidateDirectory)
    throw error
  }
}

async function discardCandidate(candidate: LockCandidate): Promise<void> {
  await removeObservedOwner(candidate.path)
  await removeEmptyDirectory(candidate.directory)
}

export async function fileLockPath(resource: string): Promise<string> {
  return join(LOCK_ROOT, `${await resourceKey(resource)}.v3.lock`)
}

async function recoverAbandonedOwners(directory: string): Promise<boolean> {
  let names: string[]
  try {
    names = await readdir(directory)
  } catch (error) {
    if (hasFileSystemErrorCode(error, 'ENOENT')) return true
    throw error
  }

  if (names.length === 0) {
    return (await isOlderThanTimeout(directory)) ? await removeEmptyDirectory(directory) : false
  }

  const liveOwners = await Promise.all(
    names.map(async (name) => {
      const ownerPath = join(directory, name)
      if (await isLiveOwner(ownerPath)) {
        return true
      }
      await removeObservedOwner(ownerPath)
      return false
    }),
  )
  return !liveOwners.includes(true) && (await removeEmptyDirectory(directory))
}

async function isLiveOwner(path: string): Promise<boolean> {
  try {
    const owner = parseProcessOwner(await readFile(path, 'utf8'))
    if (owner) return matchesProcessOwner(owner)
    return !(await isOlderThanTimeout(path))
  } catch (error) {
    if (hasFileSystemErrorCode(error, 'ENOENT')) return false
    return true
  }
}

async function isOlderThanTimeout(path: string): Promise<boolean> {
  try {
    return Date.now() - (await stat(path)).mtimeMs >= RETRY_TIMEOUT_MS
  } catch (error) {
    if (hasFileSystemErrorCode(error, 'ENOENT')) return false
    throw error
  }
}

async function removeObservedOwner(path: string): Promise<void> {
  try {
    await unlink(path)
  } catch (error) {
    if (!hasFileSystemErrorCode(error, 'ENOENT')) throw error
  }
}

async function release(owner: LockOwner): Promise<void> {
  try {
    await unlink(owner.path)
  } catch (error) {
    if (hasFileSystemErrorCode(error, 'ENOENT')) return
    throw error
  }
  await removeEmptyDirectory(owner.directory)
}

async function removeEmptyDirectory(path: string): Promise<boolean> {
  try {
    await rmdir(path)
    return true
  } catch (error) {
    if (hasFileSystemErrorCode(error, 'ENOENT')) return true
    if (hasFileSystemErrorCode(error, 'ENOTEMPTY')) return false
    throw error
  }
}

async function resourceKey(resource: string): Promise<string> {
  return createHash('sha256')
    .update(await canonicalResourcePath(resource))
    .digest('hex')
}

function delay(milliseconds: number): Promise<void> {
  return new Promise((resolveDelay) => setTimeout(resolveDelay, milliseconds))
}
