import { Trash2 } from 'lucide-react'
import type { MutableRefObject } from 'react'
import { useTranslation } from 'react-i18next'

import { CollectionMetaBadge } from '@/app/workspace/collection-meta-badge'
import { QrRowActions } from '@/app/workspace/qr-row-actions'
import type { ActiveFilter, WorkspaceQr } from '@/app/workspace/types'
import { ArmedActionProgress } from '@/components/armed-action-progress'
import { parseDeepLink } from '@/lib/url'
import { cn } from '@/lib/utils'

type QrListItemProps = {
  qr: WorkspaceQr
  isSelected: boolean
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

export function QrListItem({
  qr,
  isSelected,
  activeFilter,
  armedDeleteId,
  armedDurationMs,
  copiedUrlId,
  itemRefs,
  onSelect,
  onCopyUrl,
  onArmDelete,
  onDelete,
}: QrListItemProps) {
  const { t } = useTranslation()
  const parsed = parseDeepLink(qr.url)
  const name = qr.title || parsed.path || t('common.qrFallback')

  return (
    <div
      ref={(node) => {
        if (node) itemRefs.current.set(qr.id, node)
        else itemRefs.current.delete(qr.id)
      }}
      data-slot="qr-list-item"
      className={cn(
        'group relative grid min-w-0 grid-cols-[minmax(0,1fr)_auto] overflow-hidden rounded-lg border shadow-sm transition-[background-color,border-color,box-shadow] [transition-duration:var(--motion-duration-panel)] [transition-timing-function:var(--motion-ease-out)]',
        isSelected
          ? 'bg-card border-[var(--signal)] shadow-[0_0_0_1px_var(--signal)]'
          : 'border-border bg-card/80 hover:border-ring/60 hover:bg-card hover:shadow-foreground/5',
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          'absolute top-2 bottom-2 left-0.5 z-10 w-1 rounded-full transition-[background-color,opacity] [transition-duration:var(--motion-duration-panel)] [transition-timing-function:var(--motion-ease-out)]',
          parsed.isValid ? 'bg-[var(--success)]' : 'bg-destructive',
          isSelected ? 'opacity-100' : 'opacity-55 group-hover:opacity-80',
        )}
      />
      <button
        type="button"
        onClick={() => onSelect(qr.id)}
        className="focus-visible:ring-ring/30 min-w-0 py-3 pr-2 pl-4 text-left outline-none focus-visible:z-10 focus-visible:ring-2 focus-visible:ring-inset"
      >
        <div className="mb-1.5 flex min-w-0 items-center gap-2">
          <strong className="truncate text-sm font-semibold">
            {qr.title || parsed.path || qr.url}
          </strong>
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
          {parsed.scheme && (
            <span className="text-muted-foreground bg-background/70 shrink-0 rounded-md border px-1.5 py-0.5 font-mono text-[10px]">
              {parsed.scheme}
            </span>
          )}
        </div>
        <div
          data-slot="qr-row-metadata"
          className="text-muted-foreground flex min-w-0 flex-col gap-1 text-xs sm:flex-row sm:items-center sm:gap-2"
        >
          <p className="min-w-0 truncate font-mono">{parsed.path || qr.url}</p>
          <CollectionMetaBadge collectionNames={qr.collectionTitles} showSeparator />
        </div>
        {qr.description && (
          <p className="text-muted-foreground mt-1 truncate text-xs">{qr.description}</p>
        )}
      </button>
      <div
        data-slot="qr-row-actions"
        className="border-border/80 bg-background/70 flex w-[137px] shrink-0 items-center gap-1 border-l p-1 sm:w-[113px]"
      >
        {armedDeleteId === qr.id ? (
          <button
            type="button"
            data-armed-for={qr.id}
            onClick={() => onDelete(qr.id)}
            className="interactive-press text-destructive bg-destructive/10 border-destructive/40 hover:bg-destructive/20 relative z-0 flex h-10 w-full items-center justify-center gap-1.5 overflow-hidden rounded-md border px-2.5 text-xs font-medium sm:h-8"
            aria-label={t('workspace.confirmDelete', { name })}
          >
            <ArmedActionProgress durationMs={armedDurationMs} />
            <Trash2 className="relative z-10 size-3.5" />
            <span className="relative z-10">{t('common.confirm')}</span>
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
