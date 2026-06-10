import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'

import { AdminEditButton } from '@/components/admin-edit-button'
import { BackToAdminLink } from '@/components/back-to-admin-link'
import { CopyButton } from '@/components/copy-button'
import { DownloadButtons } from '@/components/download-buttons'
import { Button } from '@/components/shadcn-ui/button'
import { UrlPreview } from '@/components/url-preview'
import { getQrById, getQrCollections } from '@/data/qrs'
import { renderSvg } from '@/lib/qr'

function isSafeOpenScheme(url: string): boolean {
  // Allow http(s) and any custom app scheme (xhsdiscover://, etc.) but block
  // schemes that execute code in the current origin.
  const SCHEME_BLOCKLIST = new Set(['javascript', 'data', 'vbscript', 'file'])
  const colon = url.indexOf(':')
  if (colon === -1) return false
  const scheme = url.slice(0, colon).toLowerCase()
  return !SCHEME_BLOCKLIST.has(scheme)
}

export async function generateStaticParams() {
  // Render QR pages on-demand and cache them. revalidatePath in server actions
  // (see lib/revalidate.ts) invalidates the cache when a QR or its collection
  // titles change.
  return []
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>
}): Promise<Metadata> {
  const { id } = await params
  const row = await getQrById(id)
  return {
    title: row?.title,
    description: row?.description ?? row?.url ?? undefined,
    robots: { index: false, follow: false },
  }
}

export default async function QrDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const row = await getQrById(id)
  if (!row) notFound()

  const [cols, svg] = await Promise.all([
    getQrCollections(id),
    renderSvg(row.url, { width: 480, margin: 2 }),
  ])

  return (
    <main className="mx-auto max-w-2xl space-y-8 px-4 py-10">
      <BackToAdminLink
        qrId={id}
        className="text-muted-foreground hover:text-foreground inline-flex items-center text-sm"
      >
        ← QR Codes
      </BackToAdminLink>
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold">{row.title}</h1>
        {row.description && <p className="text-muted-foreground">{row.description}</p>}
        {cols.length > 0 && (
          <div className="flex flex-wrap gap-2 text-sm">
            {cols.map((c) => (
              <Link
                key={c.id}
                href={`/c/${c.id}`}
                className="bg-muted hover:bg-muted-foreground/20 rounded-full px-3 py-1"
              >
                {c.title}
              </Link>
            ))}
          </div>
        )}
      </header>

      <div
        className="mx-auto w-fit rounded-xl border bg-white p-6"
        dangerouslySetInnerHTML={{ __html: svg }}
      />

      <section className="space-y-3">
        <h2 className="text-muted-foreground text-sm font-medium">URL</h2>
        <code className="bg-muted block rounded-md p-3 text-sm break-all">{row.url}</code>
        <CopyButton
          value={row.url}
          label="Copy URL"
          variant="default"
          size="lg"
          className="w-full"
        />
        <div className="flex flex-wrap items-center gap-2">
          {isSafeOpenScheme(row.url) && (
            <Button asChild size="sm" variant="outline">
              <a href={row.url} target="_blank" rel="noopener noreferrer">
                Open link
              </a>
            </Button>
          )}
          <DownloadButtons id={row.id} title={row.title} />
          <AdminEditButton qrId={row.id} className="ml-auto" />
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-muted-foreground text-sm font-medium">Parsed</h2>
        <div className="rounded-md border p-4">
          <UrlPreview url={row.url} />
        </div>
      </section>
    </main>
  )
}
