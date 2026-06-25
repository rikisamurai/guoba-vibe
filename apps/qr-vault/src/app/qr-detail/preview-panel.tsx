import { Check, Copy, Download } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { QrPreview } from '@/components/qr-preview'
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
      className="bg-card text-card-foreground signal-panel hidden rounded-lg border p-5 lg:block"
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
      </div>
      <div className="scan-plate flex min-h-[420px] items-center justify-center rounded-lg border p-5">
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
        <Button onClick={onDownloadPng} type="button" variant="outline" disabled={!isValid}>
          {pngDownloaded ? <Check /> : <Download />}
          {pngDownloaded ? t('common.saved') : t('common.downloadPng')}
        </Button>
      </div>
    </section>
  )
}
