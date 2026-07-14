import { use, useMemo, useSyncExternalStore } from 'react'

import { VaultContext } from '@/app/vault/vault-context'
import type { VaultHandle } from '@/app/vault/vault-types'

export function useVault(): VaultHandle {
  const store = use(VaultContext)
  if (!store) throw new Error('useVault must be used within VaultProvider')
  const view = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot)
  return useMemo(
    () => ({ view, qr: store.qr, collection: store.collection, transfer: store.transfer }),
    [store, view],
  )
}
