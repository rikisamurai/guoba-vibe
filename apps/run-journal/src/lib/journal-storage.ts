import type { RunEvent, RunRecord } from './run-types'
import { isSafeArtifactHref, parseRunRecords } from './run-validation'

export const journalStorageKey = 'run-journal-records-v2'
export const legacyStorageKey = 'run-journal-records-v1'

type ParseOptions = {
  now?: string
}

export function exportJournal(runs: RunRecord[], exportedAt = new Date().toISOString()) {
  return JSON.stringify({ version: 2, exportedAt, runs }, null, 2)
}

export function parseJournal(payload: string, options: ParseOptions = {}): RunRecord[] | null {
  try {
    const parsed: unknown = JSON.parse(payload)
    if (Array.isArray(parsed)) return migrateLegacyRuns(parsed, options.now)
    if (!parsed || typeof parsed !== 'object') return null
    const envelope = parsed as { version?: unknown; runs?: unknown }
    if (envelope.version !== 2 || !Array.isArray(envelope.runs)) return null
    return parseRunRecords(JSON.stringify(envelope.runs))
  } catch {
    return null
  }
}

function migrateLegacyRuns(values: unknown[], now = new Date().toISOString()) {
  const migrated = values.map((value, index) => migrateLegacyRun(value, index, now))
  if (migrated.some((run) => run === null)) return null
  return parseRunRecords(JSON.stringify(migrated))
}

function migrateLegacyRun(value: unknown, runIndex: number, now: string): RunRecord | null {
  if (!value || typeof value !== 'object') return null
  const legacy = value as { id?: unknown; title?: unknown; events?: unknown }
  if (
    typeof legacy.id !== 'string' ||
    !legacy.id.trim() ||
    typeof legacy.title !== 'string' ||
    !legacy.title.trim() ||
    !Array.isArray(legacy.events)
  ) {
    return null
  }

  const events: RunEvent[] = []
  for (const [index, event] of legacy.events.entries()) {
    const migrated = migrateLegacyEvent(event, runIndex, index)
    if (!migrated) return null
    events.push(migrated)
  }

  return {
    id: legacy.id,
    title: legacy.title,
    createdAt: now,
    updatedAt: now,
    evidence: 'Migrated from v1. Reconfirm each command result before citing this run.',
    events,
  }
}

function migrateLegacyEvent(value: unknown, runIndex: number, eventIndex: number): RunEvent | null {
  if (!value || typeof value !== 'object') return null
  const event = value as { kind?: unknown; label?: unknown; href?: unknown }
  if (typeof event.label !== 'string' || !event.label.trim()) return null
  const id = `legacy-${runIndex + 1}-${eventIndex + 1}`

  if (event.kind === 'artifact') {
    if (typeof event.href !== 'string' || !isSafeArtifactHref(event.href)) return null
    return { id, kind: 'artifact', label: event.label, href: event.href }
  }
  if (event.kind !== 'command' && event.kind !== 'check') return null
  return { id, kind: event.kind, label: event.label, exitCode: null }
}
