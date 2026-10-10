import type { ClaudeLinkStatus, UpdateStatus } from '../../shared/types'

export function updateLabel(status: UpdateStatus): string {
  return {
    auth_required: 'Auth required',
    diverged: 'Diverged',
    error: 'Error',
    local_modified: 'Local changes',
    local_only: 'Claude only',
    source_missing: 'Source missing',
    untracked: 'Untracked',
    up_to_date: 'Up to date',
    update_available: 'Update available',
  }[status]
}

export function linkLabel(status: ClaudeLinkStatus): string {
  return {
    claude_only: 'Claude only',
    healthy: 'Claude linked',
    missing: 'Link missing',
    real_directory: 'Claude conflict',
    wrong_target: 'Wrong target',
  }[status]
}

export function statusTone(status: UpdateStatus | ClaudeLinkStatus): string {
  if (status === 'healthy' || status === 'up_to_date') return 'good'
  if (status === 'update_available') return 'accent'
  if (status === 'untracked' || status === 'local_only' || status === 'claude_only') return 'muted'
  return 'warning'
}
