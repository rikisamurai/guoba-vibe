import { realpath } from 'node:fs/promises'
import { basename, dirname, resolve } from 'node:path'

import { hasFileSystemErrorCode } from './fs-errors'

export async function canonicalResourcePath(resource: string): Promise<string> {
  return resolveExistingAncestor(resolve(resource), [])
}

async function resolveExistingAncestor(path: string, suffix: string[]): Promise<string> {
  try {
    return resolve(await realpath(path), ...suffix)
  } catch (error) {
    if (!hasFileSystemErrorCode(error, 'ENOENT') && !hasFileSystemErrorCode(error, 'ENOTDIR')) {
      throw error
    }
    const parent = dirname(path)
    if (parent === path) throw error
    return resolveExistingAncestor(parent, [basename(path), ...suffix])
  }
}
