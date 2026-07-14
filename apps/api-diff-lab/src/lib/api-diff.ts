export type ApiShapeDiff = {
  added: string[]
  removed: string[]
  changed: string[]
  unobserved: string[]
}

export type DiffRow =
  | { kind: 'added'; path: string; afterType: string }
  | { kind: 'removed'; path: string; beforeType: string }
  | { kind: 'changed'; path: string; beforeType: string; afterType: string }
  | { kind: 'unobserved'; path: string; missingSide: 'before' | 'after'; observedType: string }

export type DiffCase = {
  id: string
  label: string
  before: string
  after: string
}

export function diffJsonShapes(before: unknown, after: unknown): ApiShapeDiff {
  const rows = buildDiffRows(before, after)

  return {
    added: rows.filter((row) => row.kind === 'added').map((row) => row.path),
    removed: rows.filter((row) => row.kind === 'removed').map((row) => row.path),
    changed: rows
      .filter((row) => row.kind === 'changed')
      .map((row) => `${row.path}:${row.beforeType}->${row.afterType}`),
    unobserved: rows
      .filter((row) => row.kind === 'unobserved')
      .map((row) => `${row.path}:${row.missingSide}`),
  }
}

export function buildDiffRows(before: unknown, after: unknown): DiffRow[] {
  const beforeShape = flattenShape(before)
  const afterShape = flattenShape(after)
  const paths = [...new Set([...beforeShape.types.keys(), ...afterShape.types.keys()])].toSorted()
  const rows: DiffRow[] = []

  for (const path of paths) {
    const beforeType = beforeShape.types.get(path)
    const afterType = afterShape.types.get(path)

    if (!beforeType && afterType) {
      if (isUnobservedPath(path, beforeShape.emptyItemPaths)) continue
      rows.push({ kind: 'added', path, afterType })
    } else if (beforeType && !afterType) {
      if (isUnobservedPath(path, afterShape.emptyItemPaths)) continue
      rows.push({ kind: 'removed', path, beforeType })
    } else if (beforeType && afterType && beforeType !== afterType) {
      rows.push({ kind: 'changed', path, beforeType, afterType })
    }
  }

  rows.push(...buildUnobservedRows(beforeShape, afterShape))
  return rows.toSorted((left, right) => left.path.localeCompare(right.path))
}

export function classifyDiffRows(rows: DiffRow[]) {
  return {
    breaking: rows.filter((row) => row.kind === 'removed' || row.kind === 'changed'),
    review: rows.filter((row) => row.kind === 'added' || row.kind === 'unobserved'),
  }
}

export function buildDiffReport(title: string, rows: DiffRow[]) {
  const grouped = classifyDiffRows(rows)
  const lines = [
    `## ${title}`,
    '',
    `Breaking changes: ${grouped.breaking.length}`,
    `Review changes: ${grouped.review.length}`,
    '',
  ]

  for (const row of grouped.breaking) {
    lines.push(`- breaking: ${readRow(row)}`)
  }

  for (const row of grouped.review) {
    lines.push(`- review: ${readRow(row)}`)
  }

  return lines.join('\n')
}

type FlattenedShape = {
  types: Map<string, string>
  emptyItemPaths: Set<string>
}

function flattenShape(value: unknown): FlattenedShape {
  const mutableShape = new Map<string, Set<string>>()
  const emptyItemPaths = new Set<string>()
  const observedItemPaths = new Set<string>()
  visitShape(value, '$', mutableShape, emptyItemPaths, observedItemPaths)

  return {
    types: new Map(
      [...mutableShape].map(([path, types]) => [path, [...types].toSorted().join(' | ')]),
    ),
    emptyItemPaths,
  }
}

function visitShape(
  value: unknown,
  path: string,
  shape: Map<string, Set<string>>,
  emptyItemPaths: Set<string>,
  observedItemPaths: Set<string>,
) {
  addType(shape, path, readType(value))

  if (Array.isArray(value)) {
    const itemPath = path === '$' ? '$[]' : `${path}[]`
    if (value.length === 0 && !observedItemPaths.has(itemPath)) emptyItemPaths.add(itemPath)
    if (value.length > 0) {
      observedItemPaths.add(itemPath)
      emptyItemPaths.delete(itemPath)
    }
    for (const item of value) {
      visitShape(item, itemPath, shape, emptyItemPaths, observedItemPaths)
    }
    return
  }

  if (!isPlainObject(value)) {
    return
  }

  for (const [key, child] of Object.entries(value)) {
    visitShape(child, appendObjectPath(path, key), shape, emptyItemPaths, observedItemPaths)
  }
}

function buildUnobservedRows(before: FlattenedShape, after: FlattenedShape): DiffRow[] {
  const rows: DiffRow[] = []
  addUnobservedSide(rows, before, after, 'before')
  addUnobservedSide(rows, after, before, 'after')
  return rows
}

function addUnobservedSide(
  rows: DiffRow[],
  emptySide: FlattenedShape,
  observedSide: FlattenedShape,
  missingSide: 'before' | 'after',
) {
  for (const path of emptySide.emptyItemPaths) {
    const parentPath = path.slice(0, -2)
    const observedType = observedSide.types.get(path)
    if (
      includesType(emptySide.types.get(parentPath), 'array') &&
      includesType(observedSide.types.get(parentPath), 'array') &&
      observedType
    ) {
      rows.push({ kind: 'unobserved', path, missingSide, observedType })
    }
  }
}

function includesType(value: string | undefined, expected: string) {
  return value?.split(' | ').includes(expected) ?? false
}

function isUnobservedPath(path: string, emptyItemPaths: Set<string>) {
  return [...emptyItemPaths].some(
    (prefix) => path === prefix || path.startsWith(`${prefix}.`) || path.startsWith(`${prefix}[`),
  )
}

function appendObjectPath(path: string, key: string) {
  if (/^[A-Z_$][\w$]*$/i.test(key) && !(path === '$' && key === '$')) {
    return path === '$' ? key : `${path}.${key}`
  }

  return `${path === '$' ? '$' : path}[${JSON.stringify(key)}]`
}

function addType(shape: Map<string, Set<string>>, path: string, type: string) {
  const types = shape.get(path) ?? new Set<string>()
  types.add(type)
  shape.set(path, types)
}

function readType(value: unknown) {
  if (Array.isArray(value)) return 'array'
  if (value === null) return 'null'
  if (isPlainObject(value)) return 'object'
  return typeof value
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value))
}

function readRow(row: DiffRow) {
  if (row.kind === 'added') return `${row.path} missing -> ${row.afterType}`
  if (row.kind === 'removed') return `${row.path} ${row.beforeType} -> missing`
  if (row.kind === 'unobserved') return `${row.path} has no ${row.missingSide} item sample`
  return `${row.path} ${row.beforeType} -> ${row.afterType}`
}
