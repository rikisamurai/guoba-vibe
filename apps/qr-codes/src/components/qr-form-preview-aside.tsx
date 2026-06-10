import { QrLivePreview } from '@/components/qr-live-preview'
import { UrlPreview } from '@/components/url-preview'

export function QrFormPreviewAside({ title, url }: { title: string; url: string }) {
  return (
    <aside className="space-y-4 lg:sticky lg:top-6">
      <QrLivePreview title={title} url={url} />
      <section className="rounded-lg border p-4">
        <h2 className="mb-3 text-sm font-medium">Parsed</h2>
        <UrlPreview url={url} />
      </section>
    </aside>
  )
}
