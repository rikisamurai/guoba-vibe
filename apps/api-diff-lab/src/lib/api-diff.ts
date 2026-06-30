export type ApiShapeDiff = {
  added: string[]
  removed: string[]
  changed: string[]
}

export type DiffRow =
  | { kind: 'added'; path: string; afterType: string }
  | { kind: 'removed'; path: string; beforeType: string }
  | { kind: 'changed'; path: string; beforeType: string; afterType: string }

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
