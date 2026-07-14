const STORAGE_KEY = 'guoba-stream:access-key'

export function loadAccessKey(): string | null {
  return localStorage.getItem(STORAGE_KEY)
}

export function saveAccessKey(key: string): void {
  localStorage.setItem(STORAGE_KEY, key)
}

export function clearAccessKey(): void {
  localStorage.removeItem(STORAGE_KEY)
}
