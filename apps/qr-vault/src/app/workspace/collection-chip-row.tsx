import { Link } from '@tanstack/react-router'
import { ChevronDown, ChevronUp, Inbox, LayoutGrid, Settings2 } from 'lucide-react'
import { type ReactNode, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

import type { ActiveFilter } from '@/app/workspace/types'
import type { VaultData } from '@/lib/storage'
import { cn } from '@/lib/utils'

type CollectionChipRowProps = {
  data: VaultData
  uncategorizedCount: number
  active: ActiveFilter
  onChange: (next: ActiveFilter) => void
}

export function CollectionChipRow({
  data,
  uncategorizedCount,
  active,
  onChange,
}: CollectionChipRowProps) {
  const { t } = useTranslation()
  const chipsRef = useRef<HTMLDivElement>(null)
  const [expanded, setExpanded] = useState(false)
  const [overflowing, setOverflowing] = useState(false)
  const [hiddenCount, setHiddenCount] = useState(0)
  const [collapsedHeight, setCollapsedHeight] = useState<number>()
  const collectionKey = data.collections.map((collection) => collection.id).join(',')

  useEffect(() => {
    const el = chipsRef.current
    if (!el) return

    function measure() {
      const node = chipsRef.current
      if (!node) return
      // Measure chip buttons only; the divider <span> has a different height and,
      // under items-center, a different offsetTop that would pollute the row count.
      const items = Array.from(node.children).filter(
        (child): child is HTMLElement => child instanceof HTMLElement && child.tagName === 'BUTTON',
      )
      const rowTops = Array.from(new Set(items.map((item) => item.offsetTop))).toSorted(
        (a, b) => a - b,
      )
      if (rowTops.length <= 3) {
        setOverflowing(false)
        setCollapsedHeight(undefined)
        return
      }
      const thirdTop = rowTops[2]
      const thirdRow = items.filter((item) => item.offsetTop === thirdTop)
      const thirdBottom = Math.max(...thirdRow.map((item) => item.offsetTop + item.offsetHeight))
      // Height relative to the first row, so it works regardless of offsetParent.
      setCollapsedHeight(thirdBottom - rowTops[0])
      setHiddenCount(items.filter((item) => item.offsetTop > thirdTop).length)
      setOverflowing(true)
    }

    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(el)
    return () => observer.disconnect()
  }, [collectionKey, uncategorizedCount])

  return (
    <div className="space-y-2">
      <div className="flex items-start gap-2">
        <div
          className="min-w-0 flex-1 overflow-hidden"
          style={!expanded && collapsedHeight ? { maxHeight: collapsedHeight } : undefined}
        >
          <div ref={chipsRef} className="flex flex-wrap items-center gap-2">
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
                count={
                  data.collectionItems.filter((item) => item.collectionId === collection.id).length
                }
                active={active === collection.id}
                onClick={() => onChange(collection.id)}
              />
            ))}
          </div>
        </div>
        <Link
          to="/collections"
          aria-label={t('workspace.manageCollections')}
          title={t('workspace.manageCollections')}
          className="text-muted-foreground hover:text-foreground hover:bg-muted/50 hover:border-border flex size-8 shrink-0 items-center justify-center rounded-md border border-transparent transition-colors"
        >
          <Settings2 className="size-4" />
        </Link>
      </div>
      {overflowing && (
        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => setExpanded((value) => !value)}
            className="text-muted-foreground hover:text-foreground flex items-center gap-1 px-1 text-xs font-medium transition-colors"
          >
            {expanded ? (
              <>
                {t('common.showLess')} <ChevronUp className="size-3.5" />
              </>
            ) : (
              <>
                {t('common.moreCount', { count: hiddenCount })} <ChevronDown className="size-3.5" />
              </>
            )}
          </button>
        </div>
      )}
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
