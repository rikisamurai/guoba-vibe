export type ApiShapeDiff = {
  added: string[]
  removed: string[]
  changed: string[]
}

export type DiffRow =
  | { kind: 'added'; path: string; afterType: string }
  | { kind: 'removed'; path: string; beforeType: string }
  | { kind: 'changed'; path: string; beforeType: string; afterType: string }

export type DiffCase = {
  id: string
  label: string
  before: string
  after: string
}

export function diffJsonShapes(before: unknown, after: unknown): ApiShapeDiff {
  const beforeShape = flattenShape(before)
  const afterShape = flattenShape(after)
  const beforePaths = new Set(beforeShape.keys())
  const afterPaths = new Set(afterShape.keys())

  return {
    added: [...afterPaths].filter((path) => !beforePaths.has(path)).sort(),
    removed: [...beforePaths].filter((path) => !afterPaths.has(path)).sort(),
    changed: [...beforePaths]
      .filter((path) => afterPaths.has(path) && beforeShape.get(path) !== afterShape.get(path))
      .map((path) => `${path}:${beforeShape.get(path)}->${afterShape.get(path)}`)
      .sort(),
  }
}

export function buildDiffRows(before: unknown, after: unknown): DiffRow[] {
  const beforeShape = flattenShape(before)
  const afterShape = flattenShape(after)
  const paths = [...new Set([...beforeShape.keys(), ...afterShape.keys()])].sort()
  const rows: DiffRow[] = []

  for (const path of paths) {
    const beforeType = beforeShape.get(path)
    const afterType = afterShape.get(path)

    if (!beforeType && afterType) {
      rows.push({ kind: 'added', path, afterType })
      continue
    }

    if (beforeType && !afterType) {
      rows.push({ kind: 'removed', path, beforeType })
      continue
    }

    if (beforeType && afterType && beforeType !== afterType) {
      rows.push({ kind: 'changed', path, beforeType, afterType })
    }
  }

  return rows
}

export function classifyDiffRows(rows: DiffRow[]) {
  return {
    breaking: rows.filter((row) => row.kind === 'removed' || row.kind === 'changed'),
    nonBreaking: rows.filter((row) => row.kind === 'added'),
  }
}

export function buildDiffReport(title: string, rows: DiffRow[]) {
  const grouped = classifyDiffRows(rows)
  const lines = [
    `## ${title}`,
    '',
    `Breaking changes: ${grouped.breaking.length}`,
    `Non-breaking changes: ${grouped.nonBreaking.length}`,
    '',
  ]

  for (const row of grouped.breaking) {
    lines.push(`- breaking: ${readRow(row)}`)
  }

  for (const row of grouped.nonBreaking) {
    lines.push(`- non-breaking: ${readRow(row)}`)
  }

  return lines.join('\n')
}

export function parseDiffCases(payload: string): DiffCase[] | null {
  try {
    const parsed = JSON.parse(payload)
    return Array.isArray(parsed) && parsed.every(isDiffCase) ? parsed : null
  } catch {
    return null
  }
}

function flattenShape(value: unknown, prefix = ''): Map<string, string> {
  if (!isPlainObject(value)) {
    return prefix ? new Map([[prefix, readType(value)]]) : new Map()
  }

  const shape = new Map<string, string>()

  for (const [key, child] of Object.entries(value)) {
    const path = prefix ? `${prefix}.${key}` : key

    if (isPlainObject(child)) {
      for (const [nestedPath, type] of flattenShape(child, path)) {
        shape.set(nestedPath, type)
      }
    } else {
      shape.set(path, readType(child))
    }
  }

  return shape
}

function readType(value: unknown) {
  if (Array.isArray(value)) {
    return 'array'
  }

  if (value === null) {
    return 'null'
  }

  return typeof value
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value))
}

function readRow(row: DiffRow) {
  if (row.kind === 'added') {
    return `${row.path} missing -> ${row.afterType}`
  }

  if (row.kind === 'removed') {
    return `${row.path} ${row.beforeType} -> missing`
  }

  return `${row.path} ${row.beforeType} -> ${row.afterType}`
}

function isDiffCase(value: unknown): value is DiffCase {
  if (!value || typeof value !== 'object') {
    return false
  }

  const candidate = value as DiffCase
  return (
    typeof candidate.id === 'string' &&
    typeof candidate.label === 'string' &&
    typeof candidate.before === 'string' &&
    typeof candidate.after === 'string'
  )
}
