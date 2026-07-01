export type RunEvent =
  | { kind: 'command' | 'check'; label: string; exitCode: number }
  | { kind: 'artifact'; label: string; href: string }

export type RunRecord = {
  id: string
  title: string
  events: RunEvent[]
}

export type RunSummary = {
  id: string
  title: string
  status: 'draft' | 'verified' | 'needs-attention'
  checkCount: number
  artifactCount: number
  failedLabels: string[]
}

export type RunStatusFilter = RunSummary['status'] | 'all'

export function summarizeRun(run: RunRecord): RunSummary {
  const executableEvents = run.events.filter((event) => event.kind !== 'artifact')
  const failedLabels = executableEvents
    .filter((event) => event.exitCode !== 0)
    .map((event) => event.label)
  const checkCount = executableEvents.length

  return {
    id: run.id,
    title: run.title,
    status: failedLabels.length > 0 ? 'needs-attention' : checkCount > 0 ? 'verified' : 'draft',
    checkCount,
    artifactCount: run.events.filter((event) => event.kind === 'artifact').length,
    failedLabels,
  }
}

export function filterRunsByStatus(runs: RunRecord[], status: RunStatusFilter): RunRecord[] {
  if (status === 'all') {
    return runs
  }

  return runs.filter((run) => summarizeRun(run).status === status)
}

export function createRunFromLog(title: string, log: string): RunRecord {
  const cleanTitle = title.trim() || 'Untitled run'

  return {
    id: slugify(cleanTitle),
    title: cleanTitle,
    events: log
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => ({ kind: 'command' as const, label: line, exitCode: 0 })),
  }
}

export function buildRunMarkdown(run: RunRecord) {
  const summary = summarizeRun(run)
  const lines = [`## ${run.title}`, '', `Status: ${summary.status}`, '', '### Checks']
  const checks = run.events.filter((event) => event.kind !== 'artifact')

  for (const event of checks) {
    lines.push(`- [${event.exitCode === 0 ? 'x' : ' '}] \`${event.label}\``)
  }

  const artifacts = run.events.filter((event) => event.kind === 'artifact')

  if (artifacts.length) {
    lines.push('', '### Artifacts')
    for (const artifact of artifacts) {
      lines.push(`- ${artifact.label}: ${artifact.href}`)
    }
  }

  return lines.join('\n')
}

export function parseRunRecords(payload: string): RunRecord[] | null {
  try {
    const parsed = JSON.parse(payload)
    return Array.isArray(parsed) && parsed.every(isRunRecord) ? parsed : null
  } catch {
    return null
  }
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

function isRunRecord(value: unknown): value is RunRecord {
  if (!value || typeof value !== 'object') {
    return false
  }

  const run = value as RunRecord
  return (
    typeof run.id === 'string' &&
    typeof run.title === 'string' &&
    Array.isArray(run.events) &&
    run.events.every(isRunEvent)
  )
}

function isRunEvent(value: unknown): value is RunEvent {
  if (!value || typeof value !== 'object') {
    return false
  }

  const event = value as RunEvent

  if (event.kind === 'artifact') {
    return typeof event.label === 'string' && typeof event.href === 'string'
  }

  return (
    (event.kind === 'command' || event.kind === 'check') &&
    typeof event.label === 'string' &&
    typeof event.exitCode === 'number'
  )
}
