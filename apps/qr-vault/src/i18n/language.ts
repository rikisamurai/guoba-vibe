export const SUPPORTED_LOCALES = ['en', 'zh-CN'] as const
export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number]

export const LOCALE_STORAGE_KEY = 'qr-vault:locale'
export const DEFAULT_LOCALE: SupportedLocale = 'en'

type LocaleStorage = Pick<Storage, 'getItem' | 'setItem'>

export function normalizeLocale(locale: string | null | undefined): SupportedLocale | null {
  if (!locale) return null
  const normalized = locale.trim().toLowerCase()
  if (!normalized) return null
  if (normalized.startsWith('zh')) return 'zh-CN'
  if (normalized.startsWith('en')) return 'en'
  return null
}

export function resolveNavigatorLocale(languages: readonly string[]): SupportedLocale {
  for (const language of languages) {
    const locale = normalizeLocale(language)
    if (locale) return locale
  }
  return DEFAULT_LOCALE
}

export function readStoredLocale(storage: LocaleStorage | undefined): SupportedLocale | null {
  if (!storage) return null
  try {
    return normalizeLocale(storage.getItem(LOCALE_STORAGE_KEY))
  } catch {
    return null
  }
}

export function saveLocale(locale: SupportedLocale, storage: LocaleStorage | undefined): void {
  if (!storage) return
  try {
    storage.setItem(LOCALE_STORAGE_KEY, locale)
  } catch {
    // Ignore storage failures; the active in-memory language still changes.
  }
}

export function detectInitialLocale(input?: {
  storage?: LocaleStorage
  languages?: readonly string[]
}): SupportedLocale {
  const storage =
    input && 'storage' in input
      ? input.storage
      : typeof window === 'undefined'
        ? undefined
        : window.localStorage
  const storedLocale = readStoredLocale(storage)
  if (storedLocale) return storedLocale

  const languages =
    input?.languages ?? (typeof navigator === 'undefined' ? [DEFAULT_LOCALE] : navigator.languages)
  return resolveNavigatorLocale(languages)
}
