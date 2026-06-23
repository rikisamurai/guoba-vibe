import { AlertCircle, Check } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { QrPreview } from '@/components/qr-preview'
import { parseDeepLink } from '@/lib/url'

export function MobileUrlPreview({ title, url }: { title: string; url: string }) {
  const { t } = useTranslation()
  const parsed = parseDeepLink(url)

  return (
    <div className="bg-muted/40 flex items-center gap-3 rounded-lg border p-2.5 lg:hidden">
      <div className="w-24 shrink-0">
        <QrPreview title={title || t('common.qrCode')} url={url} size="compact" bare />
      </div>
      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex items-center gap-1.5 text-xs font-medium">
          {parsed.isValid ? <Check className="size-3.5" /> : <AlertCircle className="size-3.5" />}
          <span>
            {parsed.isValid
              ? t('qrDetail.previewReady')
              : parsed.isEmpty
                ? t('common.enterUrlToPreview')
                : t('common.awaitingValidUrl')}
          </span>
        </div>
        <p className="text-muted-foreground truncate font-mono text-[11px]">
          {parsed.isValid ? `${parsed.scheme}://${parsed.path}` : t('qrDetail.enterSchemeAndPath')}
        </p>
      </div>
    </div>
  )
}
