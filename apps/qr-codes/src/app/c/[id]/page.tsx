import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getCollectionById } from '@/data/collections'
import { listQrCards } from '@/data/qrs'
import { QrCard } from '@/components/qr-card'

export async function generateStaticParams() {
  // Render collection pages on-demand and cache them. revalidatePath in server
  // actions invalidates the cache when membership or titles change.
  return []
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>
}): Promise<Metadata> {
  const { id } = await params
  const row = await getCollectionById(id)
  return {
    title: row?.title,
    description: row?.description ?? undefined,
    robots: { index: false, follow: false },
  }
}

export default async function CollectionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const collection = await getCollectionById(id)
  if (!collection) notFound()

  const rows = await listQrCards({ collectionId: id })

  return (
    <main className="mx-auto max-w-5xl px-4 py-10 space-y-6">
      <Link
        href="/"
        className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
      >
        ← QR Codes
      </Link>
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold">{collection.title}</h1>
        {collection.description && (
          <p className="text-muted-foreground">{collection.description}</p>
        )}
        <p className="text-sm text-muted-foreground">{rows.length} QR codes</p>
      </header>
      {rows.length === 0 ? (
        <p className="text-muted-foreground">No QRs in this collection yet.</p>
      ) : (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-4">
          {rows.map((r) => (
            <QrCard key={r.id} id={r.id} title={r.title} url={r.url} />
          ))}
        </div>
      )}
    </main>
  )
}
