import { Check, Share2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { Badge } from '@/components/shadcn-ui/badge'

type ShareHeroProps = {
  title: string
  fallbackTitle: string
  description: string
  shareCopied: boolean
  onCopyShareUrl: () => void
}

export function ShareHero({
  title,
  fallbackTitle,
  description,
  shareCopied,
  onCopyShareUrl,
}: ShareHeroProps) {
  const { t } = useTranslation()

  return (
    <div className="space-y-4 text-center">
      <Badge variant="outline" asChild>
        <button
          type="button"
          className="hover:bg-muted cursor-pointer gap-1.5"
          onClick={onCopyShareUrl}
          aria-label={t('common.copyShareUrl')}
          title={t('common.copyShareUrl')}
        >
          {shareCopied ? <Check className="size-3" /> : <Share2 className="size-3" />}
          {shareCopied ? t('share.copiedShareUrl') : t('common.copyShareUrl')}
        </button>
      </Badge>
      <h1 className="text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
        {title || fallbackTitle || t('share.untitledQr')}
      </h1>
      {description && (
        <p className="text-muted-foreground mx-auto max-w-md text-base text-balance">
          {description}
        </p>
      )}
    </div>
  )
}
