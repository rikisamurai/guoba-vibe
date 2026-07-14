export type ExecutableRunEvent = {
  id: string
  kind: 'command' | 'check'
  label: string
  exitCode: number | null
}

export type ArtifactRunEvent = {
  id: string
  kind: 'artifact'
  label: string
  href: string
}

export type RunEvent = ExecutableRunEvent | ArtifactRunEvent

export type RunRecord = {
  id: string
  title: string
  createdAt: string
  updatedAt: string
  events: RunEvent[]
  evidence?: string
  cwd?: string
  commit?: string
  durationMs?: number
}

export type RunStatus = 'draft' | 'verified' | 'needs-attention'

export type RunSummary = {
  id: string
  title: string
  status: RunStatus
  checkCount: number
  artifactCount: number
  draftCount: number
  failedLabels: string[]
}

export type RunStatusFilter = RunStatus | 'all'
export type RecordedOutcome = 'draft' | 'passed' | 'failed'

export type CreateRunInput = {
  title: string
  commandLog: string
  outcome: RecordedOutcome
  exitCode?: number
  evidence?: string
  artifactLabel?: string
  artifactHref?: string
  cwd?: string
  commit?: string
  durationMs?: number
}

export type CreateRunOptions = {
  createId?: () => string
  now?: () => Date
}
