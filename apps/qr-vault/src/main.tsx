if (import.meta.env.DEV) {
  void import('react-grab')
}

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import { VaultApp } from '@/app/vault-app'
import { openVaultStore } from '@/app/vault/vault-open'
import { createBrowserVaultStorage } from '@/app/vault/vault-storage'
import { nanoid8 } from '@/lib/ids'
import '@/i18n/i18n'

import './styles.css'

const vault = openVaultStore({
  storage: createBrowserVaultStorage(window.localStorage),
  now: () => new Date().toISOString(),
  nextId: nanoid8,
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <VaultApp initial={vault} />
  </StrictMode>,
)
