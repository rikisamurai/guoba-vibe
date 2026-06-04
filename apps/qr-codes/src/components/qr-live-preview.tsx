'use client'

import Image from 'next/image'
import QRCode from 'qrcode'
import { useEffect, useState } from 'react'

import { parseUrl } from '@/lib/url-parse'

export function QrLivePreview({ title, url }: { title: string; url: string }) {
  const [dataUrl, setDataUrl] = useState('')
  const [error, setError] = useState('')
  const parsed = parseUrl(url)

  useEffect(() => {
    let active = true

    async function render() {
      if (!parsed.isValid) {
        setDataUrl('')
        setError(url.trim() ? 'Awaiting valid URL' : 'Enter a URL to preview')
        return
      }

      try {
        const next = await QRCode.toDataURL(url, {
          width: 512,
          margin: 2,
          errorCorrectionLevel: 'M',
        })
        if (active) {
          setDataUrl(next)
          setError('')
        }
      } catch (err) {
        if (active) {
          setDataUrl('')
          setError(err instanceof Error ? err.message : 'Unable to render QR')
        }
      }
    }

    void render()

    return () => {
      active = false
    }
  }, [parsed.isValid, url])

  return (
    <div className="rounded-lg border p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-sm font-medium">Live preview</h2>
        <span
          className={`rounded-full border px-2 py-0.5 text-xs ${
            parsed.isValid ? 'text-foreground' : 'text-muted-foreground'
          }`}
        >
          {parsed.isValid ? 'Valid' : 'Invalid'}
        </span>
      </div>
      <div className="flex aspect-square items-center justify-center rounded-md border bg-white p-4">
        {dataUrl ? (
          <Image
            src={dataUrl}
            alt={title || 'QR code'}
            width={512}
            height={512}
            unoptimized
            className="size-full object-contain"
          />
        ) : (
          <div className="text-muted-foreground flex flex-col items-center gap-2 text-center text-xs">
            <div className="size-12 rounded-md border border-dashed" />
            <span>{error}</span>
          </div>
        )}
      </div>
    </div>
  )
}
