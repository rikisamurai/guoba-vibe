import { execFile } from 'node:child_process'

import { hasFileSystemErrorCode } from './fs-errors'

export interface ProcessOwner {
  pid: number
  startedAt: string
}

let ownProcessOwner: Promise<ProcessOwner> | undefined

export function currentProcessOwner(): Promise<ProcessOwner> {
  ownProcessOwner ??= readRequiredProcessOwner(process.pid).catch((error: unknown) => {
    ownProcessOwner = undefined
    throw error
  })
  return ownProcessOwner
}

export async function matchesProcessOwner(owner: ProcessOwner): Promise<boolean> {
  const current =
    owner.pid === process.pid ? await currentProcessOwner() : await readProcessOwner(owner.pid)
  return current?.startedAt === owner.startedAt
}

export function parseProcessOwner(content: string): ProcessOwner | undefined {
  try {
    const raw: unknown = JSON.parse(content)
    const pid = typeof raw === 'object' && raw !== null ? Reflect.get(raw, 'pid') : undefined
    const startedAt =
      typeof raw === 'object' && raw !== null ? Reflect.get(raw, 'startedAt') : undefined
    if (typeof pid !== 'number' || !Number.isInteger(pid) || pid <= 0) return undefined
    return typeof startedAt === 'string' && startedAt ? { pid, startedAt } : undefined
  } catch {
    return undefined
  }
}

async function readRequiredProcessOwner(pid: number): Promise<ProcessOwner> {
  const owner = await readProcessOwner(pid)
  if (!owner) throw new Error('Unable to identify the current process for resource locking.')
  return owner
}

async function readProcessOwner(pid: number): Promise<ProcessOwner | undefined> {
  const startedAt = await new Promise<string | undefined>((resolveIdentity, rejectIdentity) => {
    execFile(
      '/bin/ps',
      ['-o', 'lstart=', '-p', String(pid)],
      { encoding: 'utf8', env: { ...process.env, LC_ALL: 'C', TZ: 'UTC' } },
      (error, stdout) => {
        const identity = stdout.trim()
        if (!error && identity) {
          resolveIdentity(identity)
          return
        }
        if (isProcessAbsent(pid)) {
          resolveIdentity(undefined)
          return
        }
        rejectIdentity(error ?? new Error(`Unable to read process identity for PID ${pid}.`))
      },
    )
  })
  return startedAt ? { pid, startedAt } : undefined
}

function isProcessAbsent(pid: number): boolean {
  try {
    process.kill(pid, 0)
    return false
  } catch (error) {
    return hasFileSystemErrorCode(error, 'ESRCH')
  }
}
