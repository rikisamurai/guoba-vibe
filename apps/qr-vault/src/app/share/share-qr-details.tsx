import { AlertCircle, Check } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { QrPreview } from '@/components/qr-preview'
import type { ParsedDeepLink } from '@/lib/url'

type ShareQrDetailsProps = {
  title: string
  url: string
  parsed: ParsedDeepLink
  onDataUrl: (next: string | null) => void
}

export function ShareQrDetails({ title, url, parsed, onDataUrl }: ShareQrDetailsProps) {
  const { t } = useTranslation()

  return (
    <div className="bg-card/80 signal-panel grid gap-8 rounded-lg border p-5 backdrop-blur-sm lg:grid-cols-[380px_minmax(0,1fr)] lg:items-start lg:gap-12">
      <div className="flex flex-col items-center gap-3">
        <div className="scan-plate rounded-lg border p-5">
          <QrPreview
            url={url}
            title={title || t('share.sharedQr')}
            size="lg"
            bare
            onDataUrl={onDataUrl}
          />
        </div>
        <div className="flex items-center gap-2 text-xs">
          {parsed.isValid ? <Check className="size-3.5" /> : <AlertCircle className="size-3.5" />}
          <span className="font-medium">
            {parsed.isValid ? t('share.validDeeplink') : t('share.invalidUrl')}
          </span>
          {parsed.scheme && (
            <>
              <span className="text-muted-foreground">·</span>
              <span className="text-muted-foreground font-mono">{parsed.scheme}://</span>
            </>
          )}
        </div>
      </div>

      <div className="space-y-4 lg:pt-2">
        <p className="text-muted-foreground text-[10px] font-medium tracking-wider uppercase">
          {t('share.parsedDetails')}
        </p>
        <div className="grid grid-cols-[70px_minmax(0,1fr)] gap-x-4 gap-y-2 text-xs">
          <span className="text-muted-foreground font-mono">{t('common.scheme')}</span>
          <span className="font-mono break-all">{parsed.scheme || '—'}</span>
          <span className="text-muted-foreground font-mono">{t('common.path')}</span>
          <span className="font-mono break-all">{parsed.path || '—'}</span>
        </div>
        <QueryDetails entries={Object.entries(parsed.query)} />
      </div>
    </div>
  )
}

function QueryDetails({ entries }: { entries: [string, string][] }) {
  const { t } = useTranslation()
  if (!entries.length) return null

  return (
    <div className="space-y-2 pt-2">
      <div className="flex items-center justify-between">
        <p className="text-muted-foreground text-[10px] font-medium tracking-wider uppercase">
          {t('common.queryParams')}
        </p>
        <span className="text-muted-foreground font-mono text-[10px]">
          {entries.length} {entries.length === 1 ? t('common.key') : t('common.keys')}
        </span>
      </div>
      <div className="grid gap-1">
        {entries.map(([key, value]) => (
          <div
            key={key}
            className="bg-background/65 grid grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)] gap-2 rounded-md border px-2.5 py-1.5 text-xs"
          >
            <code className="text-foreground truncate font-mono" title={key}>
              {key}
            </code>
            <code className="text-muted-foreground truncate font-mono" title={value}>
              {value || '""'}
            </code>
          </div>
        ))}
      </div>
    </div>
  )
}
