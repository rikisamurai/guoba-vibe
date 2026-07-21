import {
  buildDemoDocument,
  createEmptyDocument,
  serializeVaultDocument,
  type VaultDocument,
} from '@/app/vault/vault-document'
import {
  decodeVaultDocument,
  type InvalidVaultDocument,
  type VaultDocumentIssue,
} from '@/app/vault/vault-document-decoder'
import { VaultStorageError } from '@/app/vault/vault-storage'
import {
  createVaultStore,
  type CreateVaultStoreInput,
  type VaultStore,
} from '@/app/vault/vault-store'

export type ReadyVault = Readonly<{ kind: 'ready'; store: VaultStore }>

export type RecoveringVault = Readonly<{
  kind: 'recovery'
  raw: string
  issues: readonly VaultDocumentIssue[]
  truncated: boolean
  repair(raw: string): ReadyVault | InvalidVaultDocument
  reset(): ReadyVault
}>

export type VaultOpenResult = ReadyVault | RecoveringVault

export function openVaultStore(input: CreateVaultStoreInput): VaultOpenResult {
  let raw: string | null
  try {
    raw = input.storage.read()
  } catch (cause) {
    throw new VaultStorageError('read', cause)
  }

  if (raw === null) return persistReady(input, buildDemoDocument(input.now(), input.nextId))
  const decoded = decodeVaultDocument(raw)
  if (decoded.kind === 'valid') return ready(input, decoded.document)

  return Object.freeze({
    kind: 'recovery',
    raw,
    issues: decoded.issues,
    truncated: decoded.truncated,
    repair(candidateRaw: string) {
      const candidate = decodeVaultDocument(candidateRaw)
      return candidate.kind === 'invalid' ? candidate : persistReady(input, candidate.document)
    },
    reset: () => persistReady(input, createEmptyDocument()),
  })
}

function persistReady(input: CreateVaultStoreInput, document: VaultDocument): ReadyVault {
  const opened = ready(input, document)
  try {
    input.storage.write(serializeVaultDocument(document))
  } catch (cause) {
    throw new VaultStorageError('write', cause)
  }
  return opened
}

function ready(input: CreateVaultStoreInput, document: VaultDocument): ReadyVault {
  return Object.freeze({ kind: 'ready', store: createVaultStore(input, document) })
}
