import type { VaultData } from '@/lib/storage'

// (string & {}) keeps the literal autocomplete hints while still accepting any collection id
export type ActiveFilter = 'all' | 'uncategorized' | (string & {})
export type WorkspaceQr = VaultData['qrs'][number]
