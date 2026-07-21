import type { VaultDocumentIssue } from '@/app/vault/vault-document-decoder'

export type RepairCandidate =
  | Readonly<{ kind: 'valid'; fileName: string; raw: string }>
  | Readonly<{
      kind: 'invalid'
      fileName: string
      issues: readonly VaultDocumentIssue[]
      truncated: boolean
    }>
