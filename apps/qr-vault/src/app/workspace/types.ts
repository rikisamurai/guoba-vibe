import type { VaultData } from '@/lib/storage'

export type ActiveFilter = 'all' | 'uncategorized' | string
export type WorkspaceQr = VaultData['qrs'][number]
