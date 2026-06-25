import { FolderOpen, Link2, Tags } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { cn } from '@/lib/utils'

type CollectionCoverageRowProps = {
  collectionCount: number
  assignmentCount: number
  uncategorizedCount: number
}

export function CollectionCoverageRow({
  collectionCount,
  assignmentCount,
  uncategorizedCount,
}: CollectionCoverageRowProps) {
  const { t } = useTranslation()

  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
      <CoverageStat icon={FolderOpen} label={t('common.collections')} value={collectionCount} />
      <CoverageStat icon={Link2} label={t('common.assignments')} value={assignmentCount} />
      <CoverageStat
        icon={Tags}
        label={t('workspace.uncategorized')}
        value={uncategorizedCount}
        muted={uncategorizedCount === 0}
      />
    </div>
  )
}

function CoverageStat({
  icon: Icon,
  label,
  value,
  muted,
}: {
  icon: typeof FolderOpen
  label: string
  value: number
  muted?: boolean
}) {
  return (
    <div className="bg-card/70 signal-panel flex items-center gap-3 rounded-lg border px-3 py-2.5">
      <div
        className={cn(
          'scan-plate flex size-8 shrink-0 items-center justify-center rounded-md border',
          muted && 'opacity-60',
        )}
      >
        <Icon className="size-3.5" />
      </div>
      <div className="min-w-0">
        <div className="font-mono text-lg leading-none font-semibold tabular-nums">{value}</div>
        <div className="text-muted-foreground mt-1 truncate text-[10px] font-medium tracking-wider uppercase">
          {label}
        </div>
      </div>
    </div>
  )
}
