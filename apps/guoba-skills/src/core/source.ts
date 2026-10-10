import { posix } from 'node:path'

import type { CatalogReference } from '../shared/types'

export interface ResolvedSourceInput {
  source: string
  sourceType: 'github' | 'git'
  sourceUrl: string
  requestedSkill?: string
  requestedSubpath?: string
  requestedRef?: string
  catalog?: CatalogReference
}

export function normalizeSource(input: string, skill?: string, ref?: string): ResolvedSourceInput {
  const value = input.trim()
  const skillsSh = parseSkillsSh(value)
  if (skillsSh)
    return { ...skillsSh, requestedSkill: skill ?? skillsSh.requestedSkill, requestedRef: ref }

  const [sourcePart, fragment] = value.split('#', 2)
  const github = parseGitHub(sourcePart)
  if (github) {
    return {
      ...github,
      requestedSkill: skill,
      requestedSubpath: fragment ? normalizeSubpath(fragment) : undefined,
      requestedRef: ref,
    }
  }
  if (!isGitUrl(sourcePart)) throw new Error('Use a skills.sh URL, owner/repo, or Git URL.')
  assertSafeSourceUrl(sourcePart)
  return {
    source: sourcePart,
    sourceType: 'git',
    sourceUrl: sourcePart,
    requestedSkill: skill,
    requestedSubpath: fragment ? normalizeSubpath(fragment) : undefined,
    requestedRef: ref,
  }
}

export function normalizeSubpath(value: string): string {
  const normalized = posix.normalize(value.replaceAll('\\', '/')).replace(/^\.\//u, '')
  if (!normalized || normalized === '.' || normalized === '..' || normalized.startsWith('../')) {
    throw new Error('Skill subpath must stay inside the source repository.')
  }
  return normalized.replace(/\/SKILL\.md$/u, '')
}

function parseSkillsSh(value: string): ResolvedSourceInput | undefined {
  let url: URL
  try {
    url = new URL(value)
  } catch {
    return undefined
  }
  if (url.hostname !== 'skills.sh' && url.hostname !== 'www.skills.sh') return undefined
  const [owner, repo, slug] = url.pathname.split('/').filter(Boolean)
  if (!owner || !repo || !slug)
    throw new Error('Expected https://skills.sh/<owner>/<repo>/<skill>.')
  const source = `${owner}/${repo}`
  return {
    source,
    sourceType: 'github',
    sourceUrl: `https://github.com/${source}.git`,
    requestedSkill: slug,
    catalog: { provider: 'skills.sh', id: slug, detailUrl: url.toString() },
  }
}

function parseGitHub(value: string): ResolvedSourceInput | undefined {
  const shorthand = /^([\w.-]+)\/([\w.-]+)$/u.exec(value)
  if (shorthand) {
    const source = `${shorthand[1]}/${shorthand[2].replace(/\.git$/u, '')}`
    return { source, sourceType: 'github', sourceUrl: `https://github.com/${source}.git` }
  }
  const ssh = /^git@github\.com:([\w.-]+)\/([\w.-]+?)(?:\.git)?\/?$/u.exec(value)
  if (ssh) {
    const source = `${ssh[1]}/${ssh[2]}`
    return { source, sourceType: 'github', sourceUrl: value.replace(/\/$/u, '') }
  }
  const match = /^https?:\/\/github\.com\/([\w.-]+)\/([\w.-]+?)(?:\.git)?\/?$/u.exec(value)
  if (!match) return undefined
  const source = `${match[1]}/${match[2]}`
  return { source, sourceType: 'github', sourceUrl: `https://github.com/${source}.git` }
}

function isGitUrl(value: string): boolean {
  return /^(?:https?:\/\/|ssh:\/\/|file:\/\/|git@)[^\s]+$/u.test(value)
}

export function assertSafeSourceUrl(value: string): void {
  if (!/^(?:https?|ssh):\/\//u.test(value)) return
  const url = new URL(value)
  const webUser = /^https?:$/u.test(url.protocol) && Boolean(url.username)
  if (webUser || url.password) {
    throw new Error('Do not put credentials in a source URL; use Git credential helpers or SSH.')
  }
}
