import { describe, expect, it } from 'vitest'

import {
  parseWorkspaceFilterSearch,
  resolveWorkspaceFilter,
  workspaceFilterSearch,
} from '@/app/workspace/workspace-filter'
import type { VaultData } from '@/lib/storage'

const vault: VaultData = {
  version: 1,
  qrs: [],
  collections: [{ id: 'dev', title: 'Dev Tools', createdAt: '1', updatedAt: '1' }],
  collectionItems: [],
}

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

describe('resolveWorkspaceFilter', () => {
  it('keeps an existing collection id active', () => {
    expect(resolveWorkspaceFilter('dev', vault)).toBe('dev')
  })

  it('keeps the uncategorized filter active', () => {
    expect(resolveWorkspaceFilter('uncategorized', vault)).toBe('uncategorized')
  })

  it('falls back to all for deleted or unknown collection ids', () => {
    expect(resolveWorkspaceFilter('missing', vault)).toBe('all')
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
