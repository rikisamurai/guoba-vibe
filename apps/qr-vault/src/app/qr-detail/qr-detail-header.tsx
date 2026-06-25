import { Link } from '@tanstack/react-router'
import { ArrowLeft } from 'lucide-react'
import { useTranslation } from 'react-i18next'

export function QrDetailHeader() {
  const { t } = useTranslation()

  return (
    <div className="flex items-center">
      <Link
        to="/"
        className="text-muted-foreground hover:text-foreground flex items-center gap-1 text-xs font-medium"
      >
        <ArrowLeft className="size-3" /> {t('common.vault')}
      </Link>
    </div>
  )
}
