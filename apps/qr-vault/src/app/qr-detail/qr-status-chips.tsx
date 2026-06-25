import { AlertCircle, Check } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { Badge } from '@/components/shadcn-ui/badge'

type QrStatusChipsProps = {
  isEmpty: boolean
  isValid: boolean
  isDirty: boolean
}

export function QrStatusChips({ isEmpty, isValid, isDirty }: QrStatusChipsProps) {
  const { t } = useTranslation()

  return (
    <>
      {!isEmpty && (
        <Badge variant="outline" className="gap-1.5">
          {isValid ? (
            <Check className="size-3.5 text-green-600 dark:text-green-400" strokeWidth={2.4} />
          ) : (
            <AlertCircle className="size-3" />
          )}
          {isValid ? t('qrDetail.validUrl') : t('qrDetail.invalidUrl')}
        </Badge>
      )}
      {isDirty && (
        <Badge variant="outline" className="gap-1.5">
          <span className="size-2 rounded-full bg-amber-500" />
          {t('qrDetail.unsavedChanges')}
        </Badge>
      )}
    </>
  )
}
