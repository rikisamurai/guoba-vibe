import { Link } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'

export function ShareFooter() {
  const { t } = useTranslation()

  return (
    <footer className="bg-background/82 border-t backdrop-blur">
      <div className="text-muted-foreground mx-auto flex h-12 w-full max-w-4xl items-center justify-between px-6 text-xs">
        <span className="font-mono">{t('app.footerTagline')}</span>
        <Link to="/" className="hover:text-foreground">
          {t('common.openVault')}
        </Link>
      </div>
    </footer>
  )
}
