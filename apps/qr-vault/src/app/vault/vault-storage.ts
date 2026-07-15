export const VAULT_STORAGE_KEY = 'qr-vault:data'

export interface VaultStorageAdapter {
  read(): string | null
  write(serialized: string): void
}

export class VaultStorageError extends Error {
  override readonly cause: unknown

  constructor(operation: 'read' | 'write', cause: unknown) {
    super(`Vault storage ${operation} failed`)
    this.name = 'VaultStorageError'
    this.cause = cause
  }
}

export function createBrowserVaultStorage(storage: Storage): VaultStorageAdapter {
  return {
    read: () => storage.getItem(VAULT_STORAGE_KEY),
    write: (serialized) => storage.setItem(VAULT_STORAGE_KEY, serialized),
  }
}
