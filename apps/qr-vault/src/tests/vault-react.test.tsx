import { act, type ReactNode } from 'react'
import { createRoot } from 'react-dom/client'
import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { useVault } from '@/app/vault/use-vault'
import { VaultProvider } from '@/app/vault/vault-provider'
import type { VaultStorageAdapter } from '@/app/vault/vault-storage'
import { createVaultStore, type VaultStore } from '@/app/vault/vault-store'
import type { VaultHandle } from '@/app/vault/vault-types'

const empty = JSON.stringify({ version: 1, qrs: [], collections: [], collectionItems: [] })

function createStore(): VaultStore {
  let raw = empty
  const storage: VaultStorageAdapter = {
    read: () => raw,
    write: (next) => {
      raw = next
    },
  }
  return createVaultStore({
    storage,
    now: () => '2026-01-01T00:00:00.000Z',
    nextId: () => 'generated',
  })
}

function Probe({ capture }: { capture?: (handle: VaultHandle) => void }) {
  const vault = useVault()
  capture?.(vault)
  return <span>{vault.view.counts.qrs}</span>
}

describe('Vault React adapter', () => {
  beforeEach(() => {
    Object.defineProperty(globalThis, 'IS_REACT_ACT_ENVIRONMENT', {
      configurable: true,
      value: true,
    })
  })

  afterEach(() => {
    Object.defineProperty(globalThis, 'IS_REACT_ACT_ENVIRONMENT', {
      configurable: true,
      value: false,
    })
  })

  it('throws outside VaultProvider', () => {
    expect(() => renderToStaticMarkup(<Probe />)).toThrow(
      'useVault must be used within VaultProvider',
    )
  })

  it('rerenders Provider consumers after a successful write', async () => {
    const container = document.createElement('div')
    const root = createRoot(container)
    const store = createStore()
    let handle: VaultHandle | undefined
    const provider = (children: ReactNode) => (
      <VaultProvider store={store}>{children}</VaultProvider>
    )

    await act(async () => {
      root.render(provider(<Probe capture={(next) => (handle = next)} />))
    })
    expect(container.textContent).toBe('0')

    await act(async () => {
      handle?.qr.save({ url: 'xhsdiscover://rn/generated' })
    })
    expect(container.textContent).toBe('1')

    await act(async () => root.unmount())
  })
})
