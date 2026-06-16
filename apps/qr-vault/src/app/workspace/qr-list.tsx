import { Search, Trash2 } from 'lucide-react'
import type { MutableRefObject } from 'react'
import { useTranslation } from 'react-i18next'

import { QrRowActions } from '@/app/workspace/qr-row-actions'
import type { WorkspaceQr } from '@/app/workspace/types'
import { Card, CardContent } from '@/components/shadcn-ui/card'
import { parseDeepLink } from '@/lib/url'
import { cn } from '@/lib/utils'

type QrListProps = {
  qrs: WorkspaceQr[]
  selectedId?: string
  search: string
  armedDeleteId: string
  armedProgress: number
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
  armedDeleteId,
  armedProgress,
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
          <div className="mb-3 inline-flex size-12 items-center justify-center rounded-md border">
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
          armedProgress={armedProgress}
          copiedUrlId={copiedUrlId}
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

function QrListItem({
  qr,
  isSelected,
  armedDeleteId,
  armedProgress,
  copiedUrlId,
  itemRefs,
  onSelect,
  onCopyUrl,
  onArmDelete,
  onDelete,
}: Omit<QrListProps, 'qrs' | 'search' | 'selectedId'> & {
  qr: WorkspaceQr
  isSelected: boolean
}) {
  const { t } = useTranslation()
  const parsed = parseDeepLink(qr.url)
  const name = qr.title || parsed.path || t('common.qrFallback')

  return (
    <div
      ref={(node) => {
        if (node) itemRefs.current.set(qr.id, node)
        else itemRefs.current.delete(qr.id)
      }}
      className="group relative"
    >
      <button
        type="button"
        onClick={() => onSelect(qr.id)}
        className={cn(
          'w-full rounded-lg border px-3.5 py-3.5 pr-32 text-left shadow-sm shadow-transparent transition-all duration-200 sm:pr-28',
          isSelected
            ? 'border-foreground bg-card shadow-[0_0_0_1px_var(--foreground)]'
            : 'border-border bg-card hover:border-foreground/25 hover:bg-muted/20 hover:shadow-foreground/5',
        )}
      >
        <div className="min-w-0">
          <div className="mb-1.5 flex min-w-0 items-center gap-2">
            <span
              className={cn(
                'size-1.5 rounded-full',
                parsed.isValid ? 'bg-foreground' : 'bg-muted-foreground/50',
              )}
            />
            <strong className="truncate text-sm font-semibold">
              {qr.title || parsed.path || qr.url}
            </strong>
            {parsed.scheme && (
              <span className="text-muted-foreground bg-background/70 rounded px-1.5 py-0.5 font-mono text-[10px]">
                {parsed.scheme}
              </span>
            )}
          </div>
          <p className="text-muted-foreground truncate pl-3.5 font-mono text-xs">
            {parsed.path || qr.url}
          </p>
          {qr.description && (
            <p className="text-muted-foreground mt-0.5 truncate pl-3.5 text-xs">{qr.description}</p>
          )}
        </div>
      </button>
      <div className="absolute top-1/2 right-1.5 flex -translate-y-1/2 items-center gap-1 opacity-75 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100 sm:right-2">
        {armedDeleteId === qr.id ? (
          <button
            type="button"
            data-armed-for={qr.id}
            onClick={(event) => {
              event.stopPropagation()
              onDelete(qr.id)
            }}
            className="text-destructive bg-destructive/10 border-destructive/40 hover:bg-destructive/20 relative flex h-10 items-center gap-1.5 overflow-hidden rounded-md border px-2.5 text-xs font-medium transition-colors sm:h-8"
            aria-label={t('workspace.confirmDelete', { name })}
          >
            <Trash2 className="size-3.5" /> {t('common.confirm')}
            <span
              className="bg-destructive/40 absolute bottom-0 left-0 h-0.5"
              style={{ width: `${armedProgress * 100}%` }}
            />
          </button>
        ) : (
          <QrRowActions
            qr={qr}
            name={name}
            copiedUrlId={copiedUrlId}
            onCopyUrl={onCopyUrl}
            onArmDelete={onArmDelete}
          />
        )}
      </div>
    </div>
  )
}
