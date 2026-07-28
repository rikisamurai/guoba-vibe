import { Check, Copy, Download, ExternalLink, Save, ShieldCheck } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/shadcn-ui/button'
import { resolveOpenTarget } from '@/lib/url'

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
  const openTarget = resolveOpenTarget(url)

  return (
    <div className="mx-auto w-full max-w-xl space-y-6">
      <div className="space-y-1.5">
        <span className="text-muted-foreground text-[10px] font-medium tracking-wider uppercase">
          {t('share.rawUrl')}
        </span>
        <div className="bg-card/80 rounded-lg border p-3.5 shadow-sm">
          <p className="font-mono text-xs leading-relaxed break-all">
            {url || t('share.noUrlProvided')}
          </p>
        </div>
      </div>

      <div className="space-y-3">
        {openTarget ? (
          <Button asChild size="lg" className="w-full">
            <a
              href={openTarget.href}
              target={openTarget.mode === 'web' ? '_blank' : undefined}
              rel={openTarget.mode === 'web' ? 'noopener noreferrer' : undefined}
            >
              <ExternalLink /> {t('share.openLink')}
            </a>
          </Button>
        ) : (
          <Button type="button" disabled size="lg" className="w-full">
            <ExternalLink /> {t('share.openLink')}
          </Button>
        )}
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
          <Button type="button" variant="outline" onClick={onCopyUrl} disabled={!url} size="lg">
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
