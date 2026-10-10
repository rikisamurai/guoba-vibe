import { execFile } from 'node:child_process'
import { homedir } from 'node:os'
import { join, resolve } from 'node:path'
import { promisify } from 'node:util'

import type { SkillScope } from '../shared/types'

const execFileAsync = promisify(execFile)

export interface ManagerRoots {
  projectRoot?: string
  userHome: string
}

export interface ScopePaths {
  canonicalRoot: string
  claudeRoot: string
  lockPath: string
}

export function getManagerRoots(projectRoot?: string, userHome?: string): ManagerRoots {
  return {
    projectRoot: projectRoot ? resolve(projectRoot) : undefined,
    userHome: resolve(userHome ?? process.env.GUOBA_SKILLS_HOME ?? homedir()),
  }
}

export function getScopePaths(roots: ManagerRoots, scope: SkillScope): ScopePaths {
  if (scope === 'project') {
    if (!roots.projectRoot) throw new Error('Open a project before using Project Skills.')
    return {
      canonicalRoot: join(roots.projectRoot, '.agents', 'skills'),
      claudeRoot: join(roots.projectRoot, '.claude', 'skills'),
      lockPath: join(roots.projectRoot, 'skills-lock.json'),
    }
  }
  return {
    canonicalRoot: join(roots.userHome, '.agents', 'skills'),
    claudeRoot: join(roots.userHome, '.claude', 'skills'),
    lockPath: join(roots.userHome, '.agents', 'skills-lock.json'),
  }
}

export async function findProjectRoot(cwd = process.cwd()): Promise<string> {
  const forced = process.env.GUOBA_SKILLS_PROJECT_ROOT
  if (forced) return resolve(forced)
  try {
    const { stdout } = await execFileAsync('git', ['rev-parse', '--show-toplevel'], {
      cwd,
      encoding: 'utf8',
    })
    return stdout.trim()
  } catch {
    return resolve(cwd)
  }
}
