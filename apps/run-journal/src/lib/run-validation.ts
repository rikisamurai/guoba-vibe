import type { RunEvent, RunRecord } from './run-types'

export function parseRunRecords(payload: string): RunRecord[] | null {
  try {
    const parsed: unknown = JSON.parse(payload)
    if (!Array.isArray(parsed) || !parsed.every(isRunRecord)) return null
    const runIds = new Set(parsed.map((run) => run.id))
    return runIds.size === parsed.length ? parsed : null
  } catch {
    return null
  }
}

export function isSafeArtifactHref(value: string) {
  if (/^(?:#|\/(?!\/)|\.\.?\/)/.test(value)) return true
  try {
    const protocol = new URL(value).protocol
    return protocol === 'https:' || protocol === 'http:'
  } catch {
    return false
  }
}

function isRunRecord(value: unknown): value is RunRecord {
  if (!isObject(value)) return false
  const run = value as Partial<RunRecord>
  const eventsAreValid =
    Array.isArray(run.events) &&
    run.events.every(isRunEvent) &&
    new Set(run.events.map((event) => event.id)).size === run.events.length
  return (
    isNonEmptyString(run.id) &&
    isNonEmptyString(run.title) &&
    isIsoDate(run.createdAt) &&
    isIsoDate(run.updatedAt) &&
    eventsAreValid &&
    isOptionalString(run.evidence) &&
    isOptionalString(run.cwd) &&
    isOptionalString(run.commit) &&
    (run.durationMs === undefined || (Number.isFinite(run.durationMs) && run.durationMs >= 0))
  )
}

function isRunEvent(value: unknown): value is RunEvent {
  if (!isObject(value)) return false
  const event = value as Partial<RunEvent>
  if (!isNonEmptyString(event.id) || !isNonEmptyString(event.label)) return false
  if (event.kind === 'artifact') {
    return typeof event.href === 'string' && isSafeArtifactHref(event.href)
  }
  return (
    (event.kind === 'command' || event.kind === 'check') &&
    (event.exitCode === null || (Number.isInteger(event.exitCode) && Number(event.exitCode) >= 0))
  )
}

function isObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object'
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0
}

function isOptionalString(value: unknown) {
  return value === undefined || typeof value === 'string'
}

function isIsoDate(value: unknown) {
  return typeof value === 'string' && !Number.isNaN(Date.parse(value))
}
