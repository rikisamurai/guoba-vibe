import { Download } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { StatTile } from '@/app/import-export/stat-tile'
import type { VaultCounts } from '@/app/vault/vault-types'
import { Badge } from '@/components/shadcn-ui/badge'
import { Button } from '@/components/shadcn-ui/button'
import { Card, CardAction, CardContent, CardHeader, CardTitle } from '@/components/shadcn-ui/card'

export function SnapshotCard({ counts, onExport }: { counts: VaultCounts; onExport: () => void }) {
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
          <StatTile value={counts.qrs} label={t('common.qrCodes')} />
          <StatTile value={counts.collections} label={t('common.collections')} />
          <StatTile value={counts.assignments} label={t('common.assignments')} />
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
