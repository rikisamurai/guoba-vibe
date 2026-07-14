import { cp, mkdir, rename, rm } from 'node:fs/promises'
import { dirname, join } from 'node:path'

import { buildContentManifest } from './content-manifest'

export async function stageDirectory(source: string, target: string): Promise<string> {
  await buildContentManifest(source)
  await mkdir(dirname(target), { recursive: true })
  const staged = join(dirname(target), `.${target.split('/').at(-1)}.stage-${crypto.randomUUID()}`)
  await cp(source, staged, { recursive: true, errorOnExist: true, preserveTimestamps: true })
  await buildContentManifest(staged)
  return staged
}

export async function installDirectory(
  staged: string,
  target: string,
  commitMetadata: () => Promise<void>,
): Promise<void> {
  const targetExists = await pathExists(target)
  const backup = `${target}.backup-${crypto.randomUUID()}`
  if (targetExists) await rename(target, backup)
  try {
    await rename(staged, target)
    await commitMetadata()
  } catch (error) {
    await rm(target, { force: true, recursive: true })
    if (targetExists) await rename(backup, target)
    throw error
  }
  if (targetExists) await rm(backup, { force: true, recursive: true })
}

async function pathExists(path: string): Promise<boolean> {
  try {
    await buildContentManifest(path)
    return true
  } catch (error) {
    if (typeof error === 'object' && error !== null && 'code' in error && error.code === 'ENOENT') {
      return false
    }
    throw error
  }
}
