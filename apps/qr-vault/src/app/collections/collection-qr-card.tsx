import { Link } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'

import { Badge } from '@/components/shadcn-ui/badge'
import { Card, CardAction, CardContent, CardHeader, CardTitle } from '@/components/shadcn-ui/card'
import type { Collection, VaultData } from '@/lib/storage'
import { parseDeepLink } from '@/lib/url'
import { cn } from '@/lib/utils'

type CollectionQrCardProps = {
  collection?: Collection
  qrs: VaultData['qrs']
}

export function CollectionQrCard({ collection, qrs }: CollectionQrCardProps) {
  const { t } = useTranslation()

  if (!collection) {
    return (
      <div className="text-muted-foreground bg-muted/20 rounded-lg border border-dashed px-4 py-3 text-xs">
        {t('collections.saveBeforeAssigning')}
      </div>
    )
  }

  return (
    <Card>
      <CardHeader className="border-b">
        <div>
          <p className="text-muted-foreground mb-1 text-[10px] font-medium tracking-wider uppercase">
            {t('collections.qrsInCollection')}
          </p>
          <CardTitle>{collection.title}</CardTitle>
        </div>
        <CardAction>
          <Badge variant="secondary">{qrs.length}</Badge>
        </CardAction>
      </CardHeader>
      <CardContent className="pt-4">
        {qrs.length ? (
          <div className="grid gap-2 md:grid-cols-2">
            {qrs.map((qr) => (
              <CollectionQrLink key={qr.id} qr={qr} />
            ))}
          </div>
        ) : (
          <p className="text-muted-foreground rounded-md border border-dashed px-3 py-6 text-center text-xs italic">
            {t('collections.noQrsInCollection')}
          </p>
        )}
      </CardContent>
    </Card>
  )
}

function CollectionQrLink({ qr }: { qr: VaultData['qrs'][number] }) {
  const parsed = parseDeepLink(qr.url)

  return (
    <Link
      to="/q/$qrId"
      params={{ qrId: qr.id }}
      className="bg-card hover:bg-muted/50 group block rounded-md border p-3 transition-colors"
    >
      <div className="mb-1 flex items-center gap-2">
        <span
          className={cn(
            'size-1.5 shrink-0 rounded-full',
            parsed.isValid ? 'bg-foreground' : 'bg-muted-foreground',
          )}
        />
        <strong className="truncate text-sm font-medium group-hover:underline">
          {qr.title || parsed.path || qr.url}
        </strong>
      </div>
      <p className="text-muted-foreground truncate pl-3.5 font-mono text-xs">
        {parsed.path || qr.url}
      </p>
    </Link>
  )
}
