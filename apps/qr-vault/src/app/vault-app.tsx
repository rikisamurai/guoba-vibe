import { useState } from 'react'

import { RecoveryShell } from '@/app/recovery/recovery-shell'
import type { VaultOpenResult } from '@/app/vault/vault-open'
import { VaultProvider } from '@/app/vault/vault-provider'
import { AppRouter } from '@/router'

export function VaultApp({ initial }: { initial: VaultOpenResult }) {
  const [opened, setOpened] = useState(initial)

  if (opened.kind === 'recovery') {
    return <RecoveryShell recovery={opened} onReady={setOpened} />
  }

  return (
    <VaultProvider store={opened.store}>
      <AppRouter />
    </VaultProvider>
  )
}
