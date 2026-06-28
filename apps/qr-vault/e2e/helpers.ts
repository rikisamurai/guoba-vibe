import type { Page } from '@playwright/test'

export async function prepareEnglishVault(page: Page) {
  await page.addInitScript(() => {
    const browserGlobal = globalThis as {
      localStorage: {
        clear: () => void
        setItem: (key: string, value: string) => void
      }
      sessionStorage: {
        clear: () => void
      }
    }
    browserGlobal.localStorage.clear()
    browserGlobal.sessionStorage.clear()
    browserGlobal.localStorage.setItem('qr-vault:locale', 'en')
    browserGlobal.localStorage.setItem('qr-vault:onboarding-v1', 'skipped')
  })
}

export function uniqueName(prefix: string) {
  return `${prefix} ${Date.now()}`
}

export function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
