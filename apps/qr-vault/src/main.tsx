if (import.meta.env.DEV) {
  void import('react-grab')
}

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import { VaultProvider } from '@/app/vault/vault-provider'
import { createBrowserVaultStorage } from '@/app/vault/vault-storage'
import { createVaultStore } from '@/app/vault/vault-store'
import { nanoid8 } from '@/lib/ids'
import { AppRouter } from '@/router'
import '@/i18n/i18n'

import './styles.css'

const vaultStore = createVaultStore({
  storage: createBrowserVaultStorage(window.localStorage),
  now: () => new Date().toISOString(),
  nextId: nanoid8,
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <VaultProvider store={vaultStore}>
      <AppRouter />
    </VaultProvider>
  </StrictMode>,
)
