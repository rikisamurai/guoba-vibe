import { Search, Trash2 } from 'lucide-react'
import type { MutableRefObject } from 'react'
import { useTranslation } from 'react-i18next'

import { CollectionMetaBadge } from '@/app/workspace/collection-meta-badge'
import { QrRowActions } from '@/app/workspace/qr-row-actions'
import type { ActiveFilter, WorkspaceQr } from '@/app/workspace/types'
import { Card, CardContent } from '@/components/shadcn-ui/card'
import { parseDeepLink } from '@/lib/url'
import { cn } from '@/lib/utils'

type QrListProps = {
  qrs: WorkspaceQr[]
  selectedId?: string
  search: string
  activeFilter: ActiveFilter
  armedDeleteId: string
  armedProgress: number
  copiedUrlId: string
  collectionNamesByQrId: Record<string, string[]>
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
  armedProgress,
  copiedUrlId,
  collectionNamesByQrId,
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
          armedProgress={armedProgress}
          copiedUrlId={copiedUrlId}
          activeFilter={activeFilter}
          collectionNames={collectionNamesByQrId[qr.id] ?? []}
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
  activeFilter,
  itemRefs,
  onSelect,
  onCopyUrl,
  onArmDelete,
  onDelete,
  collectionNames,
}: Omit<QrListProps, 'qrs' | 'search' | 'selectedId' | 'collectionNamesByQrId'> & {
  qr: WorkspaceQr
  isSelected: boolean
  collectionNames: string[]
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
      className="group relative rounded-lg"
    >
      <span
        aria-hidden="true"
        className={cn(
          'absolute top-2 bottom-2 left-0.5 z-10 w-1 rounded-full transition-colors',
          parsed.isValid ? 'bg-[var(--success)]' : 'bg-destructive',
          isSelected ? 'opacity-100' : 'opacity-55 group-hover:opacity-80',
        )}
      />
      <button
        type="button"
        onClick={() => onSelect(qr.id)}
        className={cn(
          'focus-visible:ring-ring/30 w-full rounded-lg border py-3.5 pr-36 pl-4 text-left shadow-sm shadow-transparent transition-all duration-200 outline-none focus-visible:ring-2 active:translate-y-px sm:pr-32',
          isSelected
            ? 'bg-card border-[var(--signal)] shadow-[0_0_0_1px_var(--signal)]'
            : 'border-border bg-card/80 hover:border-ring/60 hover:bg-card hover:shadow-foreground/5',
        )}
      >
        <div className="min-w-0">
          <div className="mb-1.5 flex min-w-0 items-center gap-2">
            <span
              className={cn(
                'shrink-0 rounded-md border px-1.5 py-0.5 font-mono text-[10px] leading-none',
                parsed.isValid
                  ? 'border-foreground/15 bg-background/70 text-foreground'
                  : 'border-destructive/40 bg-destructive/10 text-destructive',
              )}
            >
              {parsed.isValid ? t('common.valid') : t('common.invalid')}
            </span>
            <strong className="truncate text-sm font-semibold">
              {qr.title || parsed.path || qr.url}
            </strong>
            {parsed.scheme && (
              <span className="text-muted-foreground bg-background/70 rounded-md border px-1.5 py-0.5 font-mono text-[10px]">
                {parsed.scheme}
              </span>
            )}
            <CollectionMetaBadge
              collectionNames={collectionNames}
              showSeparator={Boolean(parsed.scheme)}
            />
          </div>
          <p className="text-muted-foreground truncate font-mono text-xs">
            {parsed.path || qr.url}
          </p>
          {qr.description && (
            <p className="text-muted-foreground mt-0.5 truncate text-xs">{qr.description}</p>
          )}
        </div>
      </button>
      <div className="border-border/80 bg-background/90 shadow-foreground/5 absolute top-1/2 right-1.5 flex -translate-y-1/2 items-center gap-1 rounded-md border p-1 opacity-80 shadow-sm transition-opacity group-focus-within:opacity-100 group-hover:opacity-100 sm:right-2">
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
              className="absolute bottom-0 left-0 h-0.5 bg-[var(--warning)]"
              style={{ width: `${armedProgress * 100}%` }}
            />
          </button>
        ) : (
          <QrRowActions
            qr={qr}
            name={name}
            copiedUrlId={copiedUrlId}
            activeFilter={activeFilter}
            onCopyUrl={onCopyUrl}
            onArmDelete={onArmDelete}
          />
        )}
      </div>
    </div>
  )
}
