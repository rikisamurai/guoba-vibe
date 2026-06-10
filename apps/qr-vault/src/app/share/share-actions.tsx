import { Check, Copy, Download, Save, ShieldCheck } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/shadcn-ui/button'

type ShareActionsProps = {
  url: string
  isValid: boolean
  canDownload: boolean
  urlCopied: boolean
  pngDownloaded: boolean
  onSaveToLocal: () => void
  onDownloadPng: () => void
  onCopyUrl: () => void
}

export function ShareActions({
  url,
  isValid,
  canDownload,
  urlCopied,
  pngDownloaded,
  onSaveToLocal,
  onDownloadPng,
  onCopyUrl,
}: ShareActionsProps) {
  const { t } = useTranslation()

  return (
    <div className="mx-auto w-full max-w-xl space-y-6">
      <div className="space-y-1.5">
        <span className="text-muted-foreground text-[10px] font-medium tracking-wider uppercase">
          {t('share.rawUrl')}
        </span>
        <div className="bg-muted/50 rounded-md border p-3.5">
          <p className="font-mono text-xs leading-relaxed break-all">
            {url || t('share.noUrlProvided')}
          </p>
        </div>
      </div>

      <div className="space-y-3">
        <div className="grid gap-2 sm:grid-cols-3">
          <Button
            type="button"
            variant="outline"
            onClick={onSaveToLocal}
            disabled={!isValid}
            size="lg"
          >
            <Save /> {t('share.saveToLocal')}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={onDownloadPng}
            disabled={!canDownload}
            size="lg"
          >
            {pngDownloaded ? <Check /> : <Download />}
            {pngDownloaded ? t('common.saved') : t('common.download')}
          </Button>
          <Button type="button" onClick={onCopyUrl} disabled={!url} size="lg">
            {urlCopied ? <Check /> : <Copy />}
            {urlCopied ? t('common.copied') : t('common.copyUrl')}
          </Button>
        </div>
        <p className="text-muted-foreground flex items-center justify-center gap-1.5 text-xs">
          <ShieldCheck className="size-3" /> {t('share.staysLocal')}
        </p>
      </div>
    </div>
  )
}
