import { Search } from 'lucide-react'
import type { MutableRefObject } from 'react'
import { useTranslation } from 'react-i18next'

import { QrListItem } from '@/app/workspace/qr-list-item'
import type { ActiveFilter, WorkspaceQr } from '@/app/workspace/types'
import { Card, CardContent } from '@/components/shadcn-ui/card'

type QrListProps = {
  qrs: readonly WorkspaceQr[]
  selectedId?: string
  search: string
  activeFilter: ActiveFilter
  armedDeleteId: string
  armedDurationMs: number
  copiedUrlId: string
  itemRefs: MutableRefObject<Map<string, HTMLDivElement>>
  onSelect: (id: string) => void
  onCopyUrl: (qr: WorkspaceQr) => void
  onArmDelete: (id: string) => void
  onDelete: (id: string) => void
}

export function QrList({
  qrs,
  selectedId,
  search,
  activeFilter,
  armedDeleteId,
  armedDurationMs,
  copiedUrlId,
  itemRefs,
  onSelect,
  onCopyUrl,
  onArmDelete,
  onDelete,
}: QrListProps) {
  const { t } = useTranslation()

  if (!qrs.length) {
    return (
      <Card>
        <CardContent className="py-10 text-center">
          <div className="scan-plate mb-3 inline-flex size-12 items-center justify-center rounded-lg border">
            <Search className="text-muted-foreground size-4" />
          </div>
          <p className="mb-1 text-sm">{t('workspace.noMatches')}</p>
          <p className="text-muted-foreground text-xs">
            {search ? t('workspace.tryDifferentSearch') : t('workspace.createFirstOne')}
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-2">
      {qrs.map((qr) => (
        <QrListItem
          key={qr.id}
          qr={qr}
          isSelected={qr.id === selectedId}
          armedDeleteId={armedDeleteId}
          armedDurationMs={armedDurationMs}
          copiedUrlId={copiedUrlId}
          activeFilter={activeFilter}
          itemRefs={itemRefs}
          onSelect={onSelect}
          onCopyUrl={onCopyUrl}
          onArmDelete={onArmDelete}
          onDelete={onDelete}
        />
      ))}
    </div>
  )
}
