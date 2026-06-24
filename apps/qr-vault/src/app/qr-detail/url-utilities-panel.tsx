import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

import { Badge } from '@/components/shadcn-ui/badge'
import type { ParsedDeepLink } from '@/lib/url'

function UtilityRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="grid grid-cols-[72px_1fr] gap-3 text-sm">
      <span className="text-muted-foreground pt-0.5 text-[10px] font-medium tracking-wider uppercase">
        {label}
      </span>
      <div className="text-foreground min-w-0 font-mono text-xs break-all">{value}</div>
    </div>
  )
}

export function UrlUtilitiesPanel({ parsed }: { parsed: ParsedDeepLink }) {
  const { t } = useTranslation()
  const queryEntries = Object.entries(parsed.query)

  return (
    <section className="bg-card text-card-foreground rounded-lg border p-4">
      <div className="mb-3 flex items-center justify-between gap-4">
        <div className="grid gap-1.5">
          <p className="text-muted-foreground text-[10px] font-medium tracking-wider uppercase">
            {t('qrDetail.urlUtilities')}
          </p>
          <p className="text-sm font-medium">{t('parsedUrl.title')}</p>
        </div>
        <Badge variant="outline" className="gap-1.5">
          {queryEntries.length} {queryEntries.length === 1 ? t('common.key') : t('common.keys')}
        </Badge>
      </div>
      <div className="space-y-2">
        <UtilityRow label={t('common.scheme')} value={parsed.scheme || '-'} />
        <UtilityRow label={t('common.path')} value={parsed.path || '-'} />
        <QueryRows entries={queryEntries} />
      </div>
    </section>
  )
}

function QueryRows({ entries }: { entries: [string, string][] }) {
  const { t } = useTranslation()

  if (!entries.length) {
    return (
      <p className="text-muted-foreground rounded-md border border-dashed px-2 py-3 text-center text-xs italic">
        {t('parsedUrl.noQueryParams')}
      </p>
    )
  }

  return (
    <div className="grid gap-1 pt-1">
      {entries.slice(0, 4).map(([key, value]) => (
        <div
          key={key}
          className="bg-background/65 grid grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)] gap-2 rounded-md border px-2 py-1.5 text-xs"
        >
          <code className="truncate font-mono" title={key}>
            {key}
          </code>
          <code className="text-muted-foreground truncate font-mono" title={value}>
            {value || '""'}
          </code>
        </div>
      ))}
      {entries.length > 4 && (
        <p className="text-muted-foreground px-2 pt-1 text-xs">
          {t('qrDetail.moreQueryKeys', { count: entries.length - 4 })}
        </p>
      )}
    </div>
  )
}
