import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'

import en from '@/i18n/locales/en.json'
import zhCN from '@/i18n/locales/zh-CN.json'

import { DEFAULT_LOCALE, SUPPORTED_LOCALES, detectInitialLocale, normalizeLocale } from './language'

const initialLocale = detectInitialLocale()

void i18n.use(initReactI18next).init({
  fallbackLng: DEFAULT_LOCALE,
  interpolation: {
    escapeValue: false,
  },
  lng: initialLocale,
  resources: {
    en: { translation: en },
    'zh-CN': { translation: zhCN },
  },
  supportedLngs: SUPPORTED_LOCALES,
  react: {
    useSuspense: false,
  },
})

function syncDocumentLanguage(locale: string) {
  if (typeof document === 'undefined') return
  document.documentElement.lang = normalizeLocale(locale) ?? DEFAULT_LOCALE
}

syncDocumentLanguage(initialLocale)
i18n.on('languageChanged', syncDocumentLanguage)

export { i18n }
