import type { useNavigate } from '@tanstack/react-router'

import type { ActiveFilter } from '@/app/workspace/types'
import { parseWorkspaceFilterSearch, workspaceFilterSearch } from '@/app/workspace/workspace-filter'

export type QrDetailSearch = {
  url?: string
  title?: string
  description?: string
  filter?: string
}

type QrDetailNavigate = ReturnType<typeof useNavigate>

export function getQrDetailReturnFilter(search: QrDetailSearch): ActiveFilter {
  return parseWorkspaceFilterSearch(search)
}

export function getQrDetailRouteState(pathname: string) {
  return {
    isNew: pathname === '/new',
    qrId: pathname.startsWith('/q/') ? decodeURIComponent(pathname.slice('/q/'.length)) : '',
  }
}

export function navigateToSavedQr(
  navigate: QrDetailNavigate,
  qrId: string,
  returnFilter: ActiveFilter,
) {
  void navigate({
    to: '/q/$qrId',
    params: { qrId },
    search: workspaceFilterSearch(returnFilter),
  })
}
