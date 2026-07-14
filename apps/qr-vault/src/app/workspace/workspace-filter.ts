import type { ActiveFilter } from '@/app/workspace/types'

export type WorkspaceFilterSearch = {
  filter?: string
}

export function parseWorkspaceFilterSearch(search: { filter?: unknown }): ActiveFilter {
  return typeof search.filter === 'string' && search.filter ? search.filter : 'all'
}

export function workspaceFilterSearch(activeFilter: ActiveFilter): WorkspaceFilterSearch {
  return activeFilter === 'all' ? {} : { filter: activeFilter }
}
