import { AlertCircle, Check } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { parseDeepLink } from '@/lib/url'
import { cn } from '@/lib/utils'

export function UrlStatusStrip({ url, canSave }: { url: string; canSave: boolean }) {
  const { t } = useTranslation()
  const parsed = parseDeepLink(url)
  const isEmpty = !url.trim()

  return (
    <div
      className={cn(
        'flex flex-wrap items-center gap-x-4 gap-y-2 rounded-lg border px-3 py-2.5',
        canSave
          ? 'bg-muted/40 border-[var(--signal)]'
          : isEmpty
            ? 'bg-background/65'
            : 'border-destructive/30 bg-destructive/10',
      )}
    >
      <div className="flex min-w-44 flex-1 items-center gap-2">
        {canSave ? (
          <Check className="size-3 text-green-600 dark:text-green-400" />
        ) : (
          <AlertCircle className="size-3.5" />
        )}
        <span className="truncate text-xs font-medium">
          {canSave
            ? t('qrDetail.readyToSave')
            : isEmpty
              ? t('qrDetail.enterSchemeAndPath')
              : t('qrDetail.invalidUrl')}
        </span>
      </div>
      <StatusValue label={t('common.scheme')} value={parsed.scheme || '-'} />
      <StatusValue label={t('common.path')} value={parsed.path || '-'} wide />
      <StatusValue label={t('common.queryParams')} value={Object.keys(parsed.query).length} />
    </div>
  )
}

function StatusValue({
  label,
  value,
  wide,
}: {
  label: string
  value: string | number
  wide?: boolean
}) {
  return (
    <div
      className={cn(
        'flex min-w-0 items-center gap-1 font-mono text-[11px]',
        wide ? 'max-w-52' : 'w-24',
      )}
    >
      <span className="text-muted-foreground shrink-0 uppercase">{label}</span>
      <span className="text-foreground min-w-0 truncate font-semibold">{value}</span>
    </div>
  )
}
