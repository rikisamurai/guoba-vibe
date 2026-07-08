import { Link } from '@tanstack/react-router'
import { Plus, Search } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { CollectionChipRow } from '@/app/workspace/collection-chip-row'
import type { ActiveFilter } from '@/app/workspace/types'
import { workspaceFilterSearch } from '@/app/workspace/workspace-filter'
import { Badge } from '@/components/shadcn-ui/badge'
import { Button } from '@/components/shadcn-ui/button'
import type { VaultData } from '@/lib/storage'

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
    <section
      className="bg-card/80 signal-panel shrink-0 space-y-3 rounded-lg border p-3 backdrop-blur-sm"
      aria-labelledby="workspace-title"
    >
      <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-start">
        <div className="bg-background/55 min-w-0 rounded-lg border p-3">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-muted-foreground text-[10px] font-medium tracking-wider uppercase">
              {t('workspace.statusLine')}
            </p>
            <Badge variant="outline" className="h-5 border-[var(--signal)] px-1.5 text-[10px]">
              {t('app.footerTagline')}
            </Badge>
          </div>
          <div className="mt-2 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
            <h1
              id="workspace-title"
              className="text-2xl leading-none font-semibold tracking-tight sm:text-3xl"
            >
              {t('common.vault')}
            </h1>
            <div className="text-muted-foreground flex items-center gap-2 font-mono text-[11px]">
              <span>{t('workspace.resultCount', { count: visibleCount })}</span>
              {search && (
                <Badge variant="outline" className="h-5 px-1.5 text-[10px] tracking-normal">
                  {t('workspace.filtered')}
                </Badge>
              )}
            </div>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:auto-cols-fr sm:grid-flow-col sm:grid-cols-none">
          <SummaryPill label={t('common.qrCodes')} value={data.qrs.length} />
          <SummaryPill label={t('common.collections')} value={data.collections.length} />
        </div>
      </div>

      <div className="bg-background/45 rounded-lg border p-2.5">
        <CollectionChipRow
          data={data}
          uncategorizedCount={uncategorizedCount}
          active={activeFilter}
          onChange={onFilterChange}
        />
      </div>

      <div className="grid gap-2 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
        <div className="focus-within:border-ring/70 focus-within:ring-ring/30 bg-background/80 flex h-10 min-w-0 items-center gap-2 rounded-lg border px-3 shadow-sm transition-colors focus-within:ring-2">
          <Search className="text-muted-foreground size-3.5 shrink-0" />
          <input
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            aria-label={t('workspace.searchLabel')}
            placeholder={t('workspace.searchPlaceholder')}
            className="placeholder:text-muted-foreground min-w-0 flex-1 bg-transparent font-mono text-sm outline-none"
          />
          {search && (
            <button
              type="button"
              onClick={() => onSearchChange('')}
              className="text-muted-foreground hover:text-foreground rounded-md px-1.5 py-1 text-xs transition-colors active:translate-y-px"
            >
              {t('common.clear')}
            </button>
          )}
        </div>
        <Button asChild className="shrink-0 lg:w-auto">
          <Link
            to="/new"
            search={{ url: '', title: '', description: '', ...workspaceFilterSearch(activeFilter) }}
          >
            <Plus /> {t('nav.newQr')}
          </Link>
        </Button>
      </div>
    </section>
  )
}

function SummaryPill({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-background/70 text-card-foreground shadow-foreground/5 min-w-0 rounded-lg border px-3 py-2 shadow-sm">
      <div className="font-mono text-lg leading-none font-semibold text-[var(--signal)] tabular-nums">
        {value}
      </div>
      <div className="text-muted-foreground mt-1 truncate text-[10px] font-medium tracking-wider uppercase">
        {label}
      </div>
    </div>
  )
}
