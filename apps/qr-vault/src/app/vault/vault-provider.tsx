import type { ReactNode } from 'react'

import { VaultContext } from '@/app/vault/vault-context'
import type { VaultStore } from '@/app/vault/vault-store'

export function VaultProvider({ children, store }: { children: ReactNode; store: VaultStore }) {
  return <VaultContext value={store}>{children}</VaultContext>
}
