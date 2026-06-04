import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import { normalizeLocale, saveLocale, type SupportedLocale } from '@/i18n/language'

export function LanguageToggle() {
  const { i18n, t } = useTranslation()
  const currentLocale = normalizeLocale(i18n.resolvedLanguage ?? i18n.language) ?? 'en'
  const nextLocale: SupportedLocale = currentLocale === 'zh-CN' ? 'en' : 'zh-CN'
  const nextLabel = t(
    nextLocale === 'zh-CN' ? 'languageToggle.languages.zhCN' : 'languageToggle.languages.en',
  )
  const label = t('languageToggle.switchTo', { language: nextLabel })

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      onClick={() => {
        saveLocale(nextLocale, window.localStorage)
        void i18n.changeLanguage(nextLocale)
      }}
      aria-label={label}
      title={label}
      className="font-mono text-[11px]"
    >
      {currentLocale === 'zh-CN' ? '中' : 'EN'}
    </Button>
  )
}
