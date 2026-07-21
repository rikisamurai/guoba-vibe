import type { VaultDocument } from '@/app/vault/vault-document'

const MAX_ISSUES = 20
const MISSING = Symbol('missing')

export type VaultIssueCode =
  | 'invalid-json'
  | 'expected-object'
  | 'expected-array'
  | 'expected-string'
  | 'expected-boolean'
  | 'expected-version-1'

export type VaultReceived =
  | 'missing'
  | 'invalid-json'
  | 'null'
  | 'array'
  | 'object'
  | 'string'
  | 'number'
  | 'boolean'

export type VaultDocumentIssue = Readonly<{
  path: string
  code: VaultIssueCode
  received: VaultReceived
}>

export type InvalidVaultDocument = Readonly<{
  kind: 'invalid'
  issues: readonly VaultDocumentIssue[]
  truncated: boolean
}>

export type VaultDocumentDecodeResult =
  | Readonly<{ kind: 'valid'; document: VaultDocument }>
  | InvalidVaultDocument

type JsonRecord = Record<string, unknown>

export function decodeVaultDocument(raw: string): VaultDocumentDecodeResult {
  let parsed: unknown
  try {
    parsed = JSON.parse(raw) as unknown
  } catch {
    return invalidResult([{ path: '$', code: 'invalid-json', received: 'invalid-json' }])
  }

  const issues: VaultDocumentIssue[] = []
  let truncated = false
  const addIssue = (path: string, code: VaultIssueCode, value: unknown) => {
    if (issues.length < MAX_ISSUES) {
      issues.push(Object.freeze({ path, code, received: describeReceived(value) }))
    } else {
      truncated = true
    }
  }

  if (!isRecord(parsed)) {
    addIssue('$', 'expected-object', parsed)
  } else {
    validateVersion(parsed, addIssue)
    validateArray(parsed, 'qrs', '$.qrs', validateQr, addIssue)
    validateArray(parsed, 'collections', '$.collections', validateCollection, addIssue)
    validateArray(parsed, 'collectionItems', '$.collectionItems', validateCollectionItem, addIssue)
  }

  if (issues.length > 0) return invalidResult(issues, truncated)
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- every declared field was validated above; returning the parsed object preserves extension fields
  return Object.freeze({ kind: 'valid', document: parsed as VaultDocument })
}

type AddIssue = (path: string, code: VaultIssueCode, value: unknown) => void
type ItemValidator = (value: unknown, path: string, addIssue: AddIssue) => void

function validateVersion(value: JsonRecord, addIssue: AddIssue) {
  const version = field(value, 'version')
  if (version !== 1) addIssue('$.version', 'expected-version-1', version)
}

function validateArray(
  value: JsonRecord,
  key: string,
  path: string,
  validateItem: ItemValidator,
  addIssue: AddIssue,
) {
  const items = field(value, key)
  if (!Array.isArray(items)) {
    addIssue(path, 'expected-array', items)
    return
  }
  items.forEach((item, index) => validateItem(item, `${path}[${index}]`, addIssue))
}

function validateQr(value: unknown, path: string, addIssue: AddIssue) {
  if (!expectRecord(value, path, addIssue)) return
  validateString(value, 'id', `${path}.id`, false, addIssue)
  validateString(value, 'title', `${path}.title`, true, addIssue)
  validateString(value, 'description', `${path}.description`, true, addIssue)
  validateString(value, 'url', `${path}.url`, false, addIssue)
  validateQueryRows(value, path, addIssue)
  validateString(value, 'createdAt', `${path}.createdAt`, false, addIssue)
  validateString(value, 'updatedAt', `${path}.updatedAt`, false, addIssue)
}

function validateCollection(value: unknown, path: string, addIssue: AddIssue) {
  if (!expectRecord(value, path, addIssue)) return
  validateString(value, 'id', `${path}.id`, false, addIssue)
  validateString(value, 'title', `${path}.title`, false, addIssue)
  validateString(value, 'description', `${path}.description`, true, addIssue)
  validateString(value, 'createdAt', `${path}.createdAt`, false, addIssue)
  validateString(value, 'updatedAt', `${path}.updatedAt`, false, addIssue)
}

function validateCollectionItem(value: unknown, path: string, addIssue: AddIssue) {
  if (!expectRecord(value, path, addIssue)) return
  validateString(value, 'collectionId', `${path}.collectionId`, false, addIssue)
  validateString(value, 'qrId', `${path}.qrId`, false, addIssue)
}

function validateQueryRows(value: JsonRecord, path: string, addIssue: AddIssue) {
  const rows = field(value, 'queryParams')
  if (rows === MISSING) return
  if (!Array.isArray(rows)) {
    addIssue(`${path}.queryParams`, 'expected-array', rows)
    return
  }
  rows.forEach((row, index) => {
    const rowPath = `${path}.queryParams[${index}]`
    if (!expectRecord(row, rowPath, addIssue)) return
    validateString(row, 'id', `${rowPath}.id`, false, addIssue)
    validateString(row, 'key', `${rowPath}.key`, false, addIssue)
    validateString(row, 'value', `${rowPath}.value`, false, addIssue)
    const enabled = field(row, 'enabled')
    if (typeof enabled !== 'boolean') addIssue(`${rowPath}.enabled`, 'expected-boolean', enabled)
  })
}

function validateString(
  value: JsonRecord,
  key: string,
  path: string,
  optional: boolean,
  addIssue: AddIssue,
) {
  const candidate = field(value, key)
  if (optional && candidate === MISSING) return
  if (typeof candidate !== 'string') addIssue(path, 'expected-string', candidate)
}

function expectRecord(value: unknown, path: string, addIssue: AddIssue): value is JsonRecord {
  if (isRecord(value)) return true
  addIssue(path, 'expected-object', value)
  return false
}

function isRecord(value: unknown): value is JsonRecord {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

function field(value: JsonRecord, key: string): unknown {
  return Object.hasOwn(value, key) ? value[key] : MISSING
}

function describeReceived(value: unknown): VaultReceived {
  if (value === MISSING) return 'missing'
  if (value === null) return 'null'
  if (Array.isArray(value)) return 'array'
  if (typeof value === 'string') return 'string'
  if (typeof value === 'number') return 'number'
  if (typeof value === 'boolean') return 'boolean'
  return 'object'
}

function invalidResult(issues: VaultDocumentIssue[], truncated = false): InvalidVaultDocument {
  return Object.freeze({ kind: 'invalid', issues: Object.freeze(issues), truncated })
}
