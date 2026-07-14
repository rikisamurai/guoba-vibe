import { describe, expect, it } from 'vitest'

import { parseWorkspaceFilterSearch, workspaceFilterSearch } from '@/app/workspace/workspace-filter'

describe('parseWorkspaceFilterSearch', () => {
  it('reads a collection id from route search', () => {
    expect(parseWorkspaceFilterSearch({ filter: 'dev' })).toBe('dev')
  })

  it('falls back to all for empty or non-string search values', () => {
    expect(parseWorkspaceFilterSearch({})).toBe('all')
    expect(parseWorkspaceFilterSearch({ filter: 42 })).toBe('all')
    expect(parseWorkspaceFilterSearch({ filter: '' })).toBe('all')
  })
})

describe('workspaceFilterSearch', () => {
  it('omits the all filter from URL search', () => {
    expect(workspaceFilterSearch('all')).toEqual({})
  })

  it('writes collection and uncategorized filters to URL search', () => {
    expect(workspaceFilterSearch('dev')).toEqual({ filter: 'dev' })
    expect(workspaceFilterSearch('uncategorized')).toEqual({ filter: 'uncategorized' })
  })
})
