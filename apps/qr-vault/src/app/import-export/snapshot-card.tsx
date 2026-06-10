import { Download } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { StatTile } from '@/app/import-export/stat-tile'
import { Badge } from '@/components/shadcn-ui/badge'
import { Button } from '@/components/shadcn-ui/button'
import { Card, CardAction, CardContent, CardHeader, CardTitle } from '@/components/shadcn-ui/card'
import type { VaultData } from '@/lib/storage'

export function SnapshotCard({ data, onExport }: { data: VaultData; onExport: () => void }) {
  const { t } = useTranslation()

  return (
    <Card>
      <CardHeader className="border-b">
        <CardTitle>{t('importExport.vaultSnapshot')}</CardTitle>
        <CardAction>
          <Badge variant="outline">JSON v1</Badge>
        </CardAction>
      </CardHeader>
      <CardContent className="space-y-5 pt-4">
        <div className="grid grid-cols-3 gap-2.5">
          <StatTile value={data.qrs.length} label={t('common.qrCodes')} />
          <StatTile value={data.collections.length} label={t('common.collections')} />
          <StatTile value={data.collectionItems.length} label={t('common.assignments')} />
        </div>
        <div>
          <Button type="button" onClick={onExport} size="lg" className="w-full">
            <Download /> {t('importExport.exportSnapshot')}
          </Button>
          <p className="text-muted-foreground mt-3 text-xs leading-relaxed">
            {t('importExport.exportDescriptionStart')}{' '}
            <code className="text-foreground font-mono">.json</code>{' '}
            {t('importExport.exportDescriptionEnd')}
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
