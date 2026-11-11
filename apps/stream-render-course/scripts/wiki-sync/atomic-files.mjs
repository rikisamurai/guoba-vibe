import { randomUUID } from 'node:crypto'
import { mkdir, open, readdir, rename, rm } from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'

export async function replaceFile(destination, contents) {
  const directory = path.dirname(destination)
  await mkdir(directory, { recursive: true })
  const temporary = path.join(directory, `.wiki-sync-${randomUUID()}.tmp`)
  const handle = await open(temporary, 'wx', 0o600)
  try {
    try {
      await handle.writeFile(contents, 'utf8')
    } finally {
      await handle.close()
    }
    await rename(temporary, destination)
  } finally {
    await rm(temporary, { force: true })
  }
}

function activeWriter(name) {
  const match = /^\.wiki-sync-writer-([1-9]\d*)-[0-9a-f-]+$/.exec(name)
  if (!match) return false
  try {
    process.kill(Number(match[1]), 0)
    return true
  } catch (error) {
    return error.code !== 'ESRCH'
  }
}

export async function withWikiWriter(target, write) {
  await mkdir(target, { recursive: true })
  const name = `.wiki-sync-writer-${process.pid}-${randomUUID()}`
  const marker = path.join(target, name)
  const handle = await open(marker, 'wx', 0o600)
  try {
    await handle.close()
    // Publish our intent before checking for peers. A crashed process does not hold the target.
    if ((await readdir(target)).some((entry) => entry !== name && activeWriter(entry))) {
      throw new Error('Another wiki sync is active for this target')
    }
    return await write()
  } finally {
    await rm(marker, { force: true })
  }
}
