import { Link } from '@tanstack/react-router'
import { ArrowLeft } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/shadcn-ui/button'
import { Card, CardContent } from '@/components/shadcn-ui/card'

export function NotFoundCard() {
  const { t } = useTranslation()

  return (
    <Card>
      <CardContent className="space-y-4 py-12 text-center">
        <p className="text-xl font-semibold">{t('qrDetail.notFoundTitle')}</p>
        <p className="text-muted-foreground text-sm">{t('qrDetail.notFoundDescription')}</p>
        <Link to="/">
          <Button type="button">
            <ArrowLeft /> {t('common.backToVault')}
          </Button>
        </Link>
      </CardContent>
    </Card>
  )
}
