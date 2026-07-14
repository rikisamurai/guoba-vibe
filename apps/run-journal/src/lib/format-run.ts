export function formatRunDate(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))
}

export function formatDuration(durationMs?: number) {
  if (durationMs === undefined) return '—'
  if (durationMs < 1_000) return `${Math.round(durationMs)}ms`
  if (durationMs < 60_000) return `${(durationMs / 1_000).toFixed(durationMs < 10_000 ? 1 : 0)}s`
  const minutes = Math.floor(durationMs / 60_000)
  const seconds = Math.round((durationMs % 60_000) / 1_000)
  return `${minutes}m ${seconds}s`
}

export function runStatusLabel(status: 'draft' | 'verified' | 'needs-attention') {
  if (status === 'verified') return 'Passed'
  if (status === 'needs-attention') return 'Failed'
  return 'Draft'
}
