import { Link } from '@tanstack/react-router'
import { ArrowLeft, QrCode } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { LanguageToggle } from '@/components/language-toggle'
import { ThemeToggle } from '@/components/theme-toggle'

export function ShareHeader() {
  const { t } = useTranslation()

  return (
    <header className="bg-background/82 border-b backdrop-blur">
      <div className="mx-auto flex h-14 w-full max-w-4xl items-center justify-between px-6">
        <Link to="/" className="flex items-center gap-2.5">
          <div className="scan-plate flex aspect-square size-7 items-center justify-center rounded-md border">
            <QrCode className="size-3.5" />
          </div>
          <span className="font-semibold tracking-tight">{t('app.brand')}</span>
        </Link>
        <div className="flex items-center gap-3">
          <Link
            to="/"
            className="text-muted-foreground hover:text-foreground hidden items-center gap-1.5 text-xs sm:inline-flex"
          >
            <ArrowLeft className="size-3" /> {t('share.backToVault')}
          </Link>
          <LanguageToggle />
          <ThemeToggle />
        </div>
      </div>
    </header>
  )
}
