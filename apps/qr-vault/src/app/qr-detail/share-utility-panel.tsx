import { Check, Share2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/shadcn-ui/button'

type ShareUtilityPanelProps = {
  shareUrl: string
  canCopy: boolean
  shareCopied: boolean
  onCopyShareUrl: () => void
}

export function ShareUtilityPanel({
  shareUrl,
  canCopy,
  shareCopied,
  onCopyShareUrl,
}: ShareUtilityPanelProps) {
  const { t } = useTranslation()

  return (
    <section className="bg-card text-card-foreground rounded-lg border p-4">
      <div className="mb-3 flex items-center justify-between gap-4">
        <div>
          <p className="text-muted-foreground text-[10px] font-medium tracking-wider uppercase">
            {t('qrDetail.shareUtility')}
          </p>
          <p className="text-sm font-medium">{t('common.shareLink')}</p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="icon-sm"
          onClick={onCopyShareUrl}
          disabled={!canCopy}
          title={t('qrDetail.copyShareUrl')}
          aria-label={t('qrDetail.copyShareUrl')}
        >
          {shareCopied ? <Check /> : <Share2 />}
        </Button>
      </div>
      <div className="bg-background/65 rounded-lg border p-3">
        <p className="text-foreground font-mono text-[10px] leading-relaxed break-all">
          {canCopy ? shareUrl : t('common.notReady')}
        </p>
      </div>
      <p className="text-muted-foreground mt-2 text-xs">{t('qrDetail.shareDescription')}</p>
    </section>
  )
}
