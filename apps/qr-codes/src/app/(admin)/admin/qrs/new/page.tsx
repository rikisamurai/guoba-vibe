import { listCollections } from '@/data/collections'
import { QrForm } from '@/components/qr-form'
import { createQr } from '@/server/qrs'
import { createCollectionInline } from '@/server/collections'

export default async function NewQrPage({
  searchParams,
}: {
  searchParams: Promise<{ c?: string }>
}) {
  const { c } = await searchParams
  const cols = await listCollections()

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
  const initial = validCollectionIds.length
    ? { title: '', description: null, url: '', collectionIds: validCollectionIds }
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
