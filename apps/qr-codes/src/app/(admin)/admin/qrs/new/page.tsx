import { QrForm } from '@/components/qr-form'
import { listCollections } from '@/data/collections'
import { createCollectionInline } from '@/server/collections'
import { createQr } from '@/server/qrs'

export default async function NewQrPage({
  searchParams,
}: {
  searchParams: Promise<{ c?: string; title?: string; description?: string; url?: string }>
}) {
  const [{ c, title, description, url }, cols] = await Promise.all([
    searchParams,
    listCollections(),
  ])

  async function handle(input: {
    title: string
    description: string | null
    url: string
    collectionIds: string[]
  }) {
    'use server'
    await createQr(input)
  }

  async function handleCreateCollection(input: { title: string; description: string | null }) {
    'use server'
    return createCollectionInline(input)
  }

  const validCollectionIds = c && cols.some((col) => col.id === c) ? [c] : []
  const hasPrefill = title || description || url || validCollectionIds.length
  const initial = hasPrefill
    ? {
        title: title ?? '',
        description: description ?? null,
        url: url ?? '',
        collectionIds: validCollectionIds,
      }
    : undefined

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">New QR</h1>
      <QrForm
        collections={cols}
        initial={initial}
        onSubmit={handle}
        onCreateCollection={handleCreateCollection}
        submitLabel="Create"
      />
    </div>
  )
}
