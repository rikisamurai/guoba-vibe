import { mkdir, rm, symlink, utimes, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'

import { expect, it } from 'vitest'

import { fileLockPath, withFileLock } from './file-lock'
import { createTestWorkspace } from './test-helpers'

it('recovers a lock left by a process that no longer exists', async () => {
  const fixture = await createTestWorkspace()
  try {
    const resource = join(fixture.project, 'skills-lock.json')
    await createAbandonedLock(resource)
    await expect(withFileLock(resource, async () => 'recovered')).resolves.toBe('recovered')
  } finally {
    await fixture.cleanup()
  }
})

it('serializes concurrent recoverers of the same abandoned lock', async () => {
  const fixture = await createTestWorkspace()
  try {
    const resource = join(fixture.project, 'skills-lock.json')
    await createAbandonedLock(resource)
    let active = 0
    let maxConcurrent = 0

    await Promise.all(
      Array.from({ length: 20 }, () =>
        withFileLock(resource, async () => {
          active += 1
          maxConcurrent = Math.max(maxConcurrent, active)
          await delay(5)
          active -= 1
        }),
      ),
    )

    expect(maxConcurrent).toBe(1)
  } finally {
    await fixture.cleanup()
  }
})

it('recovers an old empty lock directory left before owner creation', async () => {
  const fixture = await createTestWorkspace()
  try {
    const resource = join(fixture.project, 'skills-lock.json')
    const directory = await fileLockPath(resource)
    const staleTime = new Date(Date.now() - 10_000)
    await mkdir(directory, { recursive: true })
    await utimes(directory, staleTime, staleTime)

    await expect(withFileLock(resource, async () => 'recovered')).resolves.toBe('recovered')
  } finally {
    await fixture.cleanup()
  }
})

it('does not collide with a legacy file lock', async () => {
  const fixture = await createTestWorkspace()
  try {
    const resource = join(fixture.project, 'skills-lock.json')
    const currentPath = await fileLockPath(resource)
    const legacyBase = currentPath.replace(/\.v3\.lock$/, '')
    const legacyPaths = [`${legacyBase}.lock`, `${legacyBase}.v2.lock`]
    try {
      await mkdir(dirname(currentPath), { recursive: true })
      await Promise.all(
        legacyPaths.map((path) => writeFile(path, `${JSON.stringify({ pid: 99_999_999 })}\n`)),
      )

      await expect(withFileLock(resource, async () => 'acquired')).resolves.toBe('acquired')
    } finally {
      await Promise.all(legacyPaths.map((path) => rm(path, { force: true })))
    }
  } finally {
    await fixture.cleanup()
  }
})

it('serializes path aliases that resolve to the same resource', async () => {
  const fixture = await createTestWorkspace()
  try {
    const alias = join(fixture.root, 'project-alias')
    const resource = join(fixture.project, 'skills-lock.json')
    const aliasedResource = join(alias, 'skills-lock.json')
    await symlink(fixture.project, alias, 'dir')
    expect(await fileLockPath(aliasedResource)).toBe(await fileLockPath(resource))
    let active = 0
    let maxConcurrent = 0
    const action = async (): Promise<void> => {
      active += 1
      maxConcurrent = Math.max(maxConcurrent, active)
      await delay(20)
      active -= 1
    }

    await Promise.all([withFileLock(resource, action), withFileLock(aliasedResource, action)])

    expect(maxConcurrent).toBe(1)
  } finally {
    await fixture.cleanup()
  }
})

it('recovers an owner record after its PID has been reused', async () => {
  const fixture = await createTestWorkspace()
  try {
    const resource = join(fixture.project, 'skills-lock.json')
    const directory = await fileLockPath(resource)
    await mkdir(directory, { recursive: true })
    await writeFile(
      join(directory, 'owner-reused.json'),
      `${JSON.stringify({ pid: process.pid, startedAt: 'an older process' })}\n`,
    )

    await expect(withFileLock(resource, async () => 'recovered')).resolves.toBe('recovered')
  } finally {
    await fixture.cleanup()
  }
})

async function createAbandonedLock(resource: string): Promise<void> {
  const directory = await fileLockPath(resource)
  await mkdir(directory, { recursive: true })
  await writeFile(
    join(directory, 'owner-crashed.json'),
    `${JSON.stringify({ pid: 99_999_999, startedAt: 'not running' })}\n`,
  )
}

function delay(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds))
}
