import { createContext } from 'react'

import type { VaultStore } from '@/app/vault/vault-store'

export const VaultContext = createContext<VaultStore | null>(null)
