import { Link } from '@tanstack/react-router'
import { AlertCircle, ArrowLeft, Check } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { Badge } from '@/components/shadcn-ui/badge'
import { cn } from '@/lib/utils'

type QrDetailHeaderProps = {
  isEmpty: boolean
  isValid: boolean
}

export function QrDetailHeader({ isEmpty, isValid }: QrDetailHeaderProps) {
  const { t } = useTranslation()

  return (
    <div className="flex items-center justify-between gap-4">
      <Link
        to="/"
        className="text-muted-foreground hover:text-foreground flex items-center gap-1 text-xs font-medium"
      >
        <ArrowLeft className="size-3" /> {t('common.vault')}
      </Link>
      <Badge variant="outline" className={cn('gap-1.5', isEmpty && 'hidden')}>
        {isValid ? (
          <Check className="size-3.5 text-green-600 dark:text-green-400" strokeWidth={2.4} />
        ) : (
          <AlertCircle className="size-3" />
        )}
        {isValid ? t('qrDetail.readyToSave') : t('qrDetail.invalidUrl')}
      </Badge>
    </div>
  )
}
