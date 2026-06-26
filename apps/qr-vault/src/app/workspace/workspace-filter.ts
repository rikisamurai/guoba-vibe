import type { ActiveFilter } from '@/app/workspace/types'
import type { VaultData } from '@/lib/storage'

export type WorkspaceFilterSearch = {
  filter?: string
}

export function parseWorkspaceFilterSearch(search: { filter?: unknown }): ActiveFilter {
  return typeof search.filter === 'string' && search.filter ? search.filter : 'all'
}

export function resolveWorkspaceFilter(
  filter: ActiveFilter,
  data: Pick<VaultData, 'collections'>,
): ActiveFilter {
  if (filter === 'all' || filter === 'uncategorized') return filter
  return data.collections.some((collection) => collection.id === filter) ? filter : 'all'
}

export function workspaceFilterSearch(activeFilter: ActiveFilter): WorkspaceFilterSearch {
  return activeFilter === 'all' ? {} : { filter: activeFilter }
}
