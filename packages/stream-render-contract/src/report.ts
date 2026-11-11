import { isLessonDemoId, type LessonDemoId } from './manifest'

export interface CheckpointResult {
  id: string
  label: string
  passed: boolean
  detail?: string
}

export type RunOutcomeKind = 'completed' | 'incomplete' | 'truncated' | 'cancelled' | 'failed'

export type DemoReport =
  | { version: 1; kind: 'ready'; demoId: LessonDemoId }
  | {
      version: 1
      kind: 'run-settled'
      demoId: LessonDemoId
      runId: string
      outcome: RunOutcomeKind
      checkpoints: readonly CheckpointResult[]
    }

const OUTCOMES: readonly RunOutcomeKind[] = [
  'completed',
  'incomplete',
  'truncated',
  'cancelled',
  'failed',
]

export function isDemoReport(value: unknown): value is DemoReport {
  if (!isRecord(value) || value.version !== 1 || !isLessonDemoId(value.demoId)) return false
  if (value.kind === 'ready') return true
  if (value.kind !== 'run-settled') return false
  return (
    typeof value.runId === 'string' &&
    value.runId.length > 0 &&
    isOutcome(value.outcome) &&
    Array.isArray(value.checkpoints) &&
    value.checkpoints.every(isCheckpoint)
  )
}

function isCheckpoint(value: unknown): value is CheckpointResult {
  if (!isRecord(value)) return false
  return (
    typeof value.id === 'string' &&
    typeof value.label === 'string' &&
    typeof value.passed === 'boolean' &&
    (value.detail === undefined || typeof value.detail === 'string')
  )
}

function isOutcome(value: unknown): value is RunOutcomeKind {
  return typeof value === 'string' && OUTCOMES.some((outcome) => outcome === value)
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}
