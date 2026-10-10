import { describe, expect, it } from 'vitest'

import { normalizeSource, normalizeSubpath } from './source'

describe('source normalization', () => {
  it('maps a skills.sh detail URL to its authoritative Git repository', () => {
    const result = normalizeSource('https://skills.sh/vercel-labs/skills/find-skills')
    expect(result).toMatchObject({
      source: 'vercel-labs/skills',
      sourceType: 'github',
      sourceUrl: 'https://github.com/vercel-labs/skills.git',
      requestedSkill: 'find-skills',
    })
    expect(result.catalog?.detailUrl).toContain('skills.sh/vercel-labs/skills/find-skills')
  })

  it('accepts GitHub shorthand and an explicit subpath', () => {
    expect(normalizeSource('owner/repo#skills/demo')).toMatchObject({
      source: 'owner/repo',
      sourceUrl: 'https://github.com/owner/repo.git',
      requestedSubpath: 'skills/demo',
    })
  })

  it('rejects traversal and embedded credentials', () => {
    expect(() => normalizeSubpath('../secret')).toThrow(/inside/u)
    expect(() => normalizeSource('https://token@github.com/owner/repo.git')).toThrow(/credentials/u)
    expect(() => normalizeSource('ssh://git:secret@example.com/skills.git')).toThrow(/credentials/u)
  })

  it('preserves the selected GitHub SSH transport', () => {
    expect(normalizeSource('git@github.com:acme/skills.git')).toMatchObject({
      source: 'acme/skills',
      sourceUrl: 'git@github.com:acme/skills.git',
    })
  })
})
