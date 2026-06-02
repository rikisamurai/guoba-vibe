import { useEffect, useState } from 'react'

import { Card, CardContent } from '@/components/ui/card'
import { renderQrDataUrl } from '@/lib/qr'
import { parseDeepLink } from '@/lib/url'
import { cn } from '@/lib/utils'

type QrPreviewProps = {
  url: string
  title?: string
  size?: 'default' | 'inspector' | 'lg'
  bare?: boolean
  onDataUrl?: (dataUrl: string | null) => void
}

const SIZE_MAP = {
  default: { qr: 260, min: 320, pad: 'p-3' },
  inspector: { qr: 420, min: 500, pad: 'p-5' },
  lg: { qr: 380, min: 440, pad: 'p-5' },
} as const

export function QrPreview({
  url,
  title = 'QR code',
  size = 'default',
  bare = false,
  onDataUrl,
}: QrPreviewProps) {
  const [dataUrl, setDataUrl] = useState('')
  const [error, setError] = useState('')
  const parsed = parseDeepLink(url)
  const dims = SIZE_MAP[size]

  useEffect(() => {
    let isActive = true

    async function render() {
      if (!parsed.isValid) {
        setDataUrl('')
        setError('Awaiting valid URL')
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
          setError(err instanceof Error ? err.message : 'Unable to render QR')
          onDataUrl?.(null)
        }
      }
    }

    void render()

    return () => {
      isActive = false
    }
  }, [parsed.isValid, url, dims.qr, onDataUrl])

  const inner = dataUrl ? (
    <img
      src={dataUrl}
      alt={title}
      className={cn('rounded-md border bg-white', dims.pad)}
      style={{ width: `min(100%, ${dims.qr}px)`, aspectRatio: '1 / 1' }}
    />
  ) : (
    <div
      className="text-muted-foreground flex flex-col items-center justify-center gap-2 rounded-md border border-dashed text-sm"
      style={{ width: `min(100%, ${dims.qr}px)`, aspectRatio: '1 / 1' }}
    >
      <div className="size-10 rounded-md border border-dashed" />
      <span className="font-mono text-xs">{error || 'No QR'}</span>
    </div>
  )

  if (bare) {
    return (
      <div className="flex items-center justify-center" aria-label="QR preview">
        {inner}
      </div>
    )
  }

  return (
    <Card aria-label="QR preview">
      <CardContent
        className="flex items-center justify-center py-6"
        style={{ minHeight: dims.min }}
      >
        {inner}
      </CardContent>
    </Card>
  )
}
