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
