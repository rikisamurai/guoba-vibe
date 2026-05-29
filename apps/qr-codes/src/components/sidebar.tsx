'use client'

import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'

import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'

type Item = { id: string; title: string }

function CollectionsList({ collections }: { collections: Item[] }) {
  const params = useSearchParams()
  const active = params.get('c') ?? undefined
  return (
    <nav className="flex flex-col gap-1">
      <Link
        href="/admin"
        className={`hover:bg-muted rounded px-2 py-1.5 text-sm ${
          !active ? 'bg-muted font-medium' : ''
        }`}
      >
        All QRs
      </Link>
      {collections.map((c) => (
        <Link
          key={c.id}
          href={`/admin?c=${c.id}`}
          className={`hover:bg-muted truncate rounded px-2 py-1.5 text-sm ${
            active === c.id ? 'bg-muted font-medium' : ''
          }`}
        >
          {c.title}
        </Link>
      ))}
    </nav>
  )
}

export function Sidebar({ collections }: { collections: Item[] }) {
  return (
    <aside className="flex w-64 shrink-0 flex-col gap-2 border-r p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-muted-foreground text-sm font-medium">Collections</h2>
        <Button asChild size="sm" variant="ghost">
          <Link href="/admin/collections/new">+ New</Link>
        </Button>
      </div>
      <Separator />
      <Suspense fallback={<div className="text-muted-foreground text-sm">…</div>}>
        <CollectionsList collections={collections} />
      </Suspense>
      <div className="mt-auto">
        <Button asChild className="w-full">
          <Link href="/admin/qrs/new">+ New QR</Link>
        </Button>
      </div>
    </aside>
  )
}
