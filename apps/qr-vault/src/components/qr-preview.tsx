import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { Card, CardContent } from '@/components/shadcn-ui/card'
import { renderQrDataUrl } from '@/lib/qr'
import { parseDeepLink } from '@/lib/url'
import { cn } from '@/lib/utils'

type QrPreviewProps = {
  url: string
  title?: string
  size?: 'default' | 'inspector' | 'lg' | 'compact'
  bare?: boolean
  onDataUrl?: (dataUrl: string | null) => void
}

const SIZE_MAP = {
  compact: { qr: 96, min: 112, pad: 'p-1.5' },
  default: { qr: 260, min: 320, pad: 'p-3' },
  inspector: { qr: 420, min: 500, pad: 'p-5' },
  lg: { qr: 380, min: 440, pad: 'p-5' },
} as const

export function QrPreview({
  url,
  title,
  size = 'default',
  bare = false,
  onDataUrl,
}: QrPreviewProps) {
  const { t } = useTranslation()
  const [dataUrl, setDataUrl] = useState('')
  const [error, setError] = useState('')
  const parsed = parseDeepLink(url)
  const dims = SIZE_MAP[size]
  const altTitle = title || t('common.qrCode')

  useEffect(() => {
    let isActive = true

    async function render() {
      if (!parsed.isValid) {
        setDataUrl('')
        setError(parsed.isEmpty ? t('common.enterUrlToPreview') : t('common.awaitingValidUrl'))
        onDataUrl?.(null)
        return
      }

      try {
        const nextDataUrl = await renderQrDataUrl(url, Math.max(dims.qr * 2, 512))
        if (isActive) {
          setDataUrl(nextDataUrl)
          setError('')
          onDataUrl?.(nextDataUrl)
        }
      } catch (err) {
        if (isActive) {
          setDataUrl('')
          setError(err instanceof Error ? err.message : t('qrPreview.unableToRender'))
          onDataUrl?.(null)
        }
      }
    }

    void render()

    return () => {
      isActive = false
    }
  }, [parsed.isEmpty, parsed.isValid, url, dims.qr, onDataUrl, t])

  const inner = dataUrl ? (
    <img
      src={dataUrl}
      alt={altTitle}
      className={cn('rounded-lg bg-white', dims.pad, bare && size === 'inspector' ? '' : 'border')}
      style={{ width: `min(100%, ${dims.qr}px)`, aspectRatio: '1 / 1' }}
    />
  ) : size === 'compact' ? (
    <div
      className="scan-plate flex items-center justify-center rounded-lg border border-dashed"
      style={{ width: `min(100%, ${dims.qr}px)`, aspectRatio: '1 / 1' }}
      aria-label={error || t('common.noQr')}
    >
      <div className="border-muted-foreground/30 size-8 rounded-md border border-dashed" />
    </div>
  ) : (
    <div
      className="scan-plate text-muted-foreground flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed text-sm"
      style={{ width: `min(100%, ${dims.qr}px)`, aspectRatio: '1 / 1' }}
    >
      <div className="size-10 rounded-md border border-dashed" />
      <span className="font-mono text-xs">{error || t('common.noQr')}</span>
    </div>
  )

  if (bare) {
    return (
      <div className="flex items-center justify-center" aria-label={t('common.qrPreview')}>
        {inner}
      </div>
    )
  }

  return (
    <Card aria-label={t('common.qrPreview')}>
      <CardContent
        className="scan-plate flex items-center justify-center py-6"
        style={{ minHeight: dims.min }}
      >
        {inner}
      </CardContent>
    </Card>
  )
}
