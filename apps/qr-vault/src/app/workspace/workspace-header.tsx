import { Link } from '@tanstack/react-router'
import { Inbox, LayoutGrid, Plus, Search, Settings2 } from 'lucide-react'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

import type { ActiveFilter } from '@/app/workspace/types'
import { Badge } from '@/components/shadcn-ui/badge'
import { Button } from '@/components/shadcn-ui/button'
import type { VaultData } from '@/lib/storage'
import { cn } from '@/lib/utils'

type WorkspaceHeaderProps = {
  data: VaultData
  uncategorizedCount: number
  activeFilter: ActiveFilter
  onFilterChange: (next: ActiveFilter) => void
  search: string
  onSearchChange: (next: string) => void
  visibleCount: number
}

export function WorkspaceHeader({
  data,
  uncategorizedCount,
  activeFilter,
  onFilterChange,
  search,
  onSearchChange,
  visibleCount,
}: WorkspaceHeaderProps) {
  const { t } = useTranslation()

  return (
    <section className="shrink-0 space-y-4 border-b pb-4" aria-labelledby="workspace-title">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0 space-y-1">
          <p className="text-muted-foreground text-[10px] font-medium tracking-wider uppercase">
            {t('workspace.statusLine')}
          </p>
          <h1
            id="workspace-title"
            className="text-2xl leading-tight font-semibold tracking-tight sm:text-3xl"
          >
            {t('common.vault')}
          </h1>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:auto-cols-fr sm:grid-flow-col sm:grid-cols-none">
          <SummaryPill label={t('common.qrCodes')} value={data.qrs.length} />
          <SummaryPill label={t('common.collections')} value={data.collections.length} />
        </div>
      </div>

      <CollectionChipRow
        data={data}
        uncategorizedCount={uncategorizedCount}
        active={activeFilter}
        onChange={onFilterChange}
      />

      <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
        <div className="focus-within:border-ring focus-within:ring-ring/50 bg-card flex h-10 min-w-0 flex-1 items-center gap-2 rounded-md border px-3 transition-colors focus-within:ring-3">
          <Search className="text-muted-foreground size-3.5 shrink-0" />
          <input
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            aria-label={t('workspace.searchLabel')}
            placeholder={t('workspace.searchPlaceholder')}
            className="placeholder:text-muted-foreground min-w-0 flex-1 bg-transparent text-sm outline-none"
          />
          {search && (
            <button
              type="button"
              onClick={() => onSearchChange('')}
              className="text-muted-foreground hover:text-foreground text-xs"
            >
              {t('common.clear')}
            </button>
          )}
        </div>
        <Button asChild className="shrink-0 lg:w-auto">
          <Link to="/new" search={{ url: '', title: '', description: '' }}>
            <Plus /> {t('nav.newQr')}
          </Link>
        </Button>
      </div>

      <div className="text-muted-foreground flex flex-wrap items-center gap-x-3 gap-y-1 px-1 text-[10px] font-medium tracking-wider uppercase">
        <span>{t('workspace.resultCount', { count: visibleCount })}</span>
        {search && (
          <Badge variant="outline" className="h-5 px-1.5 text-[10px] tracking-normal">
            {t('workspace.filtered')}
          </Badge>
        )}
      </div>
    </section>
  )
}

function SummaryPill({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-card text-card-foreground shadow-foreground/5 min-w-0 rounded-lg border px-3 py-2 shadow-sm">
      <div className="font-mono text-lg leading-none font-semibold tabular-nums">{value}</div>
      <div className="text-muted-foreground mt-1 truncate text-[10px] font-medium tracking-wider uppercase">
        {label}
      </div>
    </div>
  )
}

type CollectionChipRowProps = {
  data: VaultData
  uncategorizedCount: number
  active: ActiveFilter
  onChange: (next: ActiveFilter) => void
}

function CollectionChipRow({ data, uncategorizedCount, active, onChange }: CollectionChipRowProps) {
  const { t } = useTranslation()

  return (
    <div className="flex flex-wrap items-center gap-2 px-1 pb-3 sm:-mx-1 sm:[scrollbar-gutter:stable] sm:flex-nowrap sm:overflow-x-auto">
      <Chip
        icon={<LayoutGrid className="size-3.5" />}
        label={t('common.allQr')}
        count={data.qrs.length}
        active={active === 'all'}
        onClick={() => onChange('all')}
      />
      {uncategorizedCount > 0 && (
        <Chip
          icon={<Inbox className="size-3.5" />}
          label={t('workspace.uncategorized')}
          count={uncategorizedCount}
          active={active === 'uncategorized'}
          onClick={() => onChange('uncategorized')}
        />
      )}
      {data.collections.length > 0 && (
        <span aria-hidden className="bg-border mx-1 h-5 w-px shrink-0" />
      )}
      {data.collections.map((collection) => (
        <Chip
          key={collection.id}
          label={collection.title}
          count={data.collectionItems.filter((item) => item.collectionId === collection.id).length}
          active={active === collection.id}
          onClick={() => onChange(collection.id)}
        />
      ))}
      <div className="ml-auto shrink-0">
        <Link
          to="/collections"
          aria-label={t('workspace.manageCollections')}
          title={t('workspace.manageCollections')}
          className="text-muted-foreground hover:text-foreground hover:bg-muted/50 hover:border-border flex size-8 items-center justify-center rounded-md border border-transparent transition-colors"
        >
          <Settings2 className="size-4" />
        </Link>
      </div>
    </div>
  )
}

function Chip({
  icon,
  label,
  count,
  active,
  onClick,
}: {
  icon?: ReactNode
  label: string
  count: number
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'inline-flex h-8 max-w-full shrink-0 items-center gap-1.5 rounded-full border pr-2.5 pl-3 text-sm font-medium transition-colors sm:max-w-none',
        active
          ? 'bg-foreground text-background border-foreground'
          : 'bg-card text-muted-foreground border-border hover:text-foreground hover:bg-muted/50',
      )}
    >
      {icon && <span className="shrink-0">{icon}</span>}
      <span className="truncate">{label}</span>
      <span
        className={cn(
          'ml-0.5 font-mono text-[11px] tabular-nums',
          active ? 'text-background/70' : 'text-muted-foreground/80',
        )}
      >
        {count}
      </span>
    </button>
  )
}
