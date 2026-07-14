import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'

import { expect, it } from 'vitest'

import { fileLockPath, withFileLock } from './file-lock'
import { createTestWorkspace } from './test-helpers'

it('recovers a lock left by a process that no longer exists', async () => {
  const fixture = await createTestWorkspace()
  try {
    const resource = join(fixture.project, 'skills-lock.json')
    const lockPath = fileLockPath(resource)
    await mkdir(dirname(lockPath), { recursive: true })
    await writeFile(lockPath, `${JSON.stringify({ pid: 99_999_999, owner: 'crashed' })}\n`)
    await expect(withFileLock(resource, async () => 'recovered')).resolves.toBe('recovered')
  } finally {
    await fixture.cleanup()
  }
})
