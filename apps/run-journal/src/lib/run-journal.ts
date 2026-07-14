import type {
  CreateRunInput,
  CreateRunOptions,
  ExecutableRunEvent,
  RecordedOutcome,
  RunEvent,
  RunRecord,
  RunStatus,
  RunStatusFilter,
  RunSummary,
} from './run-types'
import { isSafeArtifactHref } from './run-validation'

export type {
  CreateRunInput,
  ExecutableRunEvent,
  RecordedOutcome,
  RunEvent,
  RunRecord,
  RunStatus,
  RunStatusFilter,
  RunSummary,
} from './run-types'
export { isSafeArtifactHref, parseRunRecords } from './run-validation'

let fallbackId = 0

export function summarizeRun(run: RunRecord): RunSummary {
  const executableEvents = run.events.filter((event) => event.kind !== 'artifact')
  const failedLabels = executableEvents
    .filter((event) => event.exitCode !== null && event.exitCode !== 0)
    .map((event) => event.label)
  const draftCount = executableEvents.filter((event) => event.exitCode === null).length
  const status = getRunStatus(executableEvents.length, failedLabels.length, draftCount)

  return {
    id: run.id,
    title: run.title,
    status,
    checkCount: executableEvents.length,
    artifactCount: run.events.filter((event) => event.kind === 'artifact').length,
    draftCount,
    failedLabels,
  }
}

export function filterRunsByStatus(runs: RunRecord[], status: RunStatusFilter): RunRecord[] {
  return status === 'all' ? runs : runs.filter((run) => summarizeRun(run).status === status)
}

export function createRunFromLog(input: CreateRunInput, options: CreateRunOptions = {}): RunRecord {
  const createId = options.createId ?? createRunId
  const id = createId()
  const timestamp = (options.now ?? (() => new Date()))().toISOString()
  const exitCode = outcomeToExitCode(input.outcome, input.exitCode)
  const events: RunEvent[] = input.commandLog
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line, index) => {
      const command = parseCommandLine(line, exitCode)
      return {
        id: `${id}-step-${index + 1}`,
        kind: 'command',
        label: command.label,
        exitCode: command.exitCode,
      }
    })

  if (input.artifactHref?.trim()) {
    const href = input.artifactHref.trim()
    if (!isSafeArtifactHref(href)) {
      throw new Error('Artifact links must use http(s) or a relative path.')
    }
    events.push({
      id: `${id}-artifact-1`,
      kind: 'artifact',
      label: input.artifactLabel?.trim() || 'Run artifact',
      href,
    })
  }

  const run: RunRecord = {
    id,
    title: input.title.trim() || 'Untitled run',
    createdAt: timestamp,
    updatedAt: timestamp,
    events,
  }
  if (input.evidence?.trim()) run.evidence = input.evidence.trim()
  if (input.cwd?.trim()) run.cwd = input.cwd.trim()
  if (input.commit?.trim()) run.commit = input.commit.trim()
  if (
    input.durationMs !== undefined &&
    Number.isFinite(input.durationMs) &&
    input.durationMs >= 0
  ) {
    run.durationMs = input.durationMs
  }
  return run
}

export function buildRunMarkdown(run: RunRecord) {
  const summary = summarizeRun(run)
  const lines = [
    `## ${run.title}`,
    '',
    `Status: ${summary.status}`,
    `Recorded: ${run.updatedAt}`,
    '',
    '### Checks',
  ]
  const checks = run.events.filter((event) => event.kind !== 'artifact')

  if (!checks.length) lines.push('- No executable steps recorded.')
  for (const event of checks) lines.push(formatCheck(event))

  if (run.evidence) {
    lines.push('', '### Command evidence', '', '```text', run.evidence, '```')
  }

  const artifacts = run.events.filter((event) => event.kind === 'artifact')
  if (artifacts.length) {
    lines.push('', '### Artifacts')
    for (const artifact of artifacts) lines.push(`- [${artifact.label}](${artifact.href})`)
  }

  return lines.join('\n')
}

function getRunStatus(checks: number, failures: number, drafts: number): RunStatus {
  if (failures > 0) return 'needs-attention'
  if (checks > 0 && drafts === 0) return 'verified'
  return 'draft'
}

function outcomeToExitCode(outcome: RecordedOutcome, exitCode?: number) {
  if (outcome === 'draft') return null
  if (outcome === 'passed') return 0
  return Number.isInteger(exitCode) && Number(exitCode) > 0 ? Number(exitCode) : 1
}

function parseCommandLine(line: string, fallbackExitCode: number | null) {
  const tagged = /^\[(\?|draft|passed|failed|\d+)\]\s+(.+)$/i.exec(line)
  if (!tagged) return { label: line, exitCode: fallbackExitCode }

  const [, token, label] = tagged
  const normalized = token.toLowerCase()
  if (normalized === '?' || normalized === 'draft') return { label, exitCode: null }
  if (normalized === 'passed') return { label, exitCode: 0 }
  if (normalized === 'failed') return { label, exitCode: 1 }
  const parsedExitCode = Number(token)
  return {
    label,
    exitCode:
      Number.isSafeInteger(parsedExitCode) && parsedExitCode >= 0
        ? parsedExitCode
        : fallbackExitCode,
  }
}

function createRunId() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID()
  fallbackId += 1
  return `run-${Date.now().toString(36)}-${fallbackId.toString(36)}`
}

function formatCheck(event: ExecutableRunEvent) {
  if (event.exitCode === null) return `- [ ] \`${event.label}\` — no result recorded`
  if (event.exitCode === 0) return `- [x] \`${event.label}\` — passed`
  return `- [ ] \`${event.label}\` — failed (exit ${event.exitCode})`
}
