import { AlertCircle, Check, Copy, Download } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { QrPreview } from '@/components/qr-preview'
import { Badge } from '@/components/shadcn-ui/badge'
import { Button } from '@/components/shadcn-ui/button'

type PreviewPanelProps = {
  title: string
  url: string
  isValid: boolean
  urlCopied: boolean
  pngDownloaded: boolean
  onDataUrl: (next: string | null) => void
  onCopyUrl: () => void
  onDownloadPng: () => void
}

export function PreviewPanel({
  title,
  url,
  isValid,
  urlCopied,
  pngDownloaded,
  onDataUrl,
  onCopyUrl,
  onDownloadPng,
}: PreviewPanelProps) {
  const { t } = useTranslation()

  return (
    <section
      data-tour="qr-preview"
      className="bg-card text-card-foreground hidden rounded-xl border p-5 lg:block"
    >
      <div className="mb-4 flex items-center justify-between gap-4">
        <div>
          <p className="text-muted-foreground text-[10px] font-medium tracking-wider uppercase">
            {t('qrDetail.livePreview')}
          </p>
          <p className="text-foreground mt-1 truncate text-sm font-medium">
            {title || t('common.untitledQr')}
          </p>
        </div>
        <Badge variant="outline" className="gap-1.5">
          {isValid ? <Check className="size-3" /> : <AlertCircle className="size-3" />}
          {isValid ? t('common.valid') : t('common.invalid')}
        </Badge>
      </div>
      <div className="flex min-h-[420px] items-center justify-center">
        <QrPreview
          title={title || t('common.qrCode')}
          url={url}
          size="lg"
          bare
          onDataUrl={onDataUrl}
        />
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2">
        <Button onClick={onCopyUrl} type="button" variant="outline" disabled={!url}>
          {urlCopied ? <Check /> : <Copy />}
          {urlCopied ? t('common.copied') : t('common.copyUrl')}
        </Button>
        <Button onClick={onDownloadPng} type="button" variant="outline" disabled={!url}>
          {pngDownloaded ? <Check /> : <Download />}
          {pngDownloaded ? t('common.saved') : t('common.downloadPng')}
        </Button>
      </div>
    </section>
  )
}
