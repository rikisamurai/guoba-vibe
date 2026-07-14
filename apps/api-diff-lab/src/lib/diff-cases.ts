import type { DiffCase } from './api-diff'

export const maxDiffCases = 50

export function parseDiffCases(payload: string): DiffCase[] | null {
  try {
    const parsed: unknown = JSON.parse(payload)

    if (!Array.isArray(parsed) || parsed.length === 0 || parsed.length > maxDiffCases) {
      return null
    }

    const validCases = parsed.filter(isDiffCase)
    const cases = validCases.map((item) => ({
      ...item,
      id: item.id.trim(),
      label: item.label.trim(),
    }))
    const ids = new Set(cases.map((item) => item.id))
    return validCases.length === parsed.length && ids.size === cases.length ? cases : null
  } catch {
    return null
  }
}

export function createDiffCase(label: string, before: string, after: string): DiffCase {
  return {
    id: createCaseId(),
    label: label.trim(),
    before,
    after,
  }
}

export function validateCaseDraft(label: string, before: string, after: string) {
  if (!label.trim()) return 'Case name is required.'
  if (!isJson(before)) return 'Before must contain valid JSON.'
  if (!isJson(after)) return 'After must contain valid JSON.'
  return ''
}

function isDiffCase(value: unknown): value is DiffCase {
  if (!isRecord(value)) return false

  return (
    typeof value.id === 'string' &&
    Boolean(value.id.trim()) &&
    typeof value.label === 'string' &&
    Boolean(value.label.trim()) &&
    typeof value.before === 'string' &&
    isJson(value.before) &&
    typeof value.after === 'string' &&
    isJson(value.after)
  )
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value))
}

function isJson(value: string) {
  try {
    JSON.parse(value)
    return true
  } catch {
    return false
  }
}

function createCaseId() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }

  return `case-${Date.now()}-${Math.random().toString(36).slice(2)}`
}
