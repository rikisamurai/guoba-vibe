import { PreviewPanel } from '@/app/qr-detail/preview-panel'
import { ShareUtilityPanel } from '@/app/qr-detail/share-utility-panel'
import { UrlUtilitiesPanel } from '@/app/qr-detail/url-utilities-panel'
import type { ParsedDeepLink } from '@/lib/url'

type QrDetailAsideProps = {
  title: string
  url: string
  parsed: ParsedDeepLink
  urlCopied: boolean
  shareUrl: string
  shareCopied: boolean
  pngDownloaded: boolean
  onDataUrl: (value: string | null) => void
  onCopyUrl: () => void
  onCopyShareUrl: () => void
  onDownloadPng: () => void
}

export function QrDetailAside({
  title,
  url,
  parsed,
  urlCopied,
  shareUrl,
  shareCopied,
  pngDownloaded,
  onDataUrl,
  onCopyUrl,
  onCopyShareUrl,
  onDownloadPng,
}: QrDetailAsideProps) {
  return (
    <aside className="space-y-3 lg:sticky lg:top-0">
      <PreviewPanel
        title={title}
        url={url}
        isValid={parsed.isValid}
        urlCopied={urlCopied}
        pngDownloaded={pngDownloaded}
        onDataUrl={onDataUrl}
        onCopyUrl={onCopyUrl}
        onDownloadPng={onDownloadPng}
      />
      <UrlUtilitiesPanel parsed={parsed} />
      <ShareUtilityPanel
        shareUrl={shareUrl}
        canCopy={Boolean(shareUrl && parsed.isValid)}
        shareCopied={shareCopied}
        onCopyShareUrl={onCopyShareUrl}
      />
    </aside>
  )
}
