'use client'

import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'

import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import type { CollectionNav } from '@/data/collections'

function CountBadge({ count }: { count: number }) {
  return <span className="text-muted-foreground ml-auto font-mono text-xs">{count}</span>
}

function CollectionsList({ nav }: { nav: CollectionNav }) {
  const params = useSearchParams()
  const active = params.get('c') ?? undefined
  const uncategorizedActive = !active && params.get('u') === '1'

  function hrefFor(filter: { collectionId?: string; uncategorized?: boolean }) {
    const next = new URLSearchParams(params.toString())
    next.delete('c')
    next.delete('u')
    if (filter.collectionId) next.set('c', filter.collectionId)
    if (filter.uncategorized) next.set('u', '1')
    const query = next.toString()
    return query ? `/admin?${query}` : '/admin'
  }

  return (
    <nav className="flex flex-col gap-1">
      <Link
        href={hrefFor({})}
        className={`hover:bg-muted flex items-center gap-2 rounded px-2 py-1.5 text-sm ${
          !active && !uncategorizedActive ? 'bg-muted font-medium' : ''
        }`}
      >
        <span>All QRs</span>
        <CountBadge count={nav.allCount} />
      </Link>
      {nav.uncategorizedCount > 0 && (
        <Link
          href={hrefFor({ uncategorized: true })}
          className={`hover:bg-muted flex items-center gap-2 rounded px-2 py-1.5 text-sm ${
            uncategorizedActive ? 'bg-muted font-medium' : ''
          }`}
        >
          <span className="truncate">Uncategorized</span>
          <CountBadge count={nav.uncategorizedCount} />
        </Link>
      )}
      {nav.collections.map((c) => (
        <Link
          key={c.id}
          href={hrefFor({ collectionId: c.id })}
          className={`hover:bg-muted flex items-center gap-2 rounded px-2 py-1.5 text-sm ${
            active === c.id ? 'bg-muted font-medium' : ''
          }`}
        >
          <span className="truncate">{c.title}</span>
          <CountBadge count={c.count} />
        </Link>
      ))}
    </nav>
  )
}

export function Sidebar({ nav }: { nav: CollectionNav }) {
  return (
    <aside className="sticky top-0 flex h-screen w-64 shrink-0 flex-col gap-2 overflow-y-auto border-r p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-muted-foreground text-sm font-medium">Collections</h2>
        <Button asChild size="sm" variant="ghost">
          <Link href="/admin/collections/new">+ New</Link>
        </Button>
      </div>
      <Separator />
      <Suspense fallback={<div className="text-muted-foreground text-sm">…</div>}>
        <CollectionsList nav={nav} />
      </Suspense>
      <div className="mt-auto">
        <Button asChild className="w-full">
          <Link href="/admin/qrs/new">+ New QR</Link>
        </Button>
      </div>
    </aside>
  )
}
