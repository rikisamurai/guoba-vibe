import { QrCard } from '@/components/qr-card'
import { SearchBar } from '@/components/search-bar'
import { getCollectionById } from '@/data/collections'
import { listQrCards } from '@/data/qrs'

type SearchParams = Promise<{ c?: string; q?: string }>

export default async function AdminHome({ searchParams }: { searchParams: SearchParams }) {
  const { c, q } = await searchParams

  const rows = await listQrCards({ search: q, collectionId: c })
  const collection = c ? await getCollectionById(c) : null
  const adminSearch = new URLSearchParams()
  if (c) adminSearch.set('c', c)
  if (q) adminSearch.set('q', q)
  const adminQuery = adminSearch.toString()
  const adminHref = adminQuery ? `/admin?${adminQuery}` : '/admin'

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-xl font-semibold">
          {collection ? collection.title : 'All QRs'}
          <span className="text-muted-foreground ml-2 text-sm">({rows.length})</span>
        </h1>
        <SearchBar />
      </div>
      {rows.length === 0 ? (
        <p className="text-muted-foreground">No QRs match.</p>
      ) : (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-4">
          {rows.map((r) => (
            <QrCard
              key={r.id}
              id={r.id}
              title={r.title}
              url={r.url}
              returnHref={adminHref}
              editable
            />
          ))}
        </div>
      )}
    </div>
  )
}
