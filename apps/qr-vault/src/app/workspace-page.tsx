import { Link } from '@tanstack/react-router'
import {
  ArrowRight,
  Inbox,
  LayoutGrid,
  Plus,
  Search,
  Settings2,
  Share2,
  SquarePen,
  Trash2,
} from 'lucide-react'
import { useEffect, useState } from 'react'

import { useVault } from '@/app/use-vault'
import { ParsedUrlPanel } from '@/components/parsed-url-panel'
import { QrPreview } from '@/components/qr-preview'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardAction, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { deleteQr } from '@/lib/storage'
import type { VaultData } from '@/lib/storage'
import { parseDeepLink } from '@/lib/url'
import { useDocumentTitle } from '@/lib/use-document-title'
import { cn } from '@/lib/utils'
import { getQrsForCollection, getUncategorizedQrs, searchQrs } from '@/lib/vault'

export function WorkspacePage() {
  useDocumentTitle('Vault')
  const { data, updateVault } = useVault()
  const [search, setSearch] = useState('')
  const [selectedId, setSelectedId] = useState('')
  const [activeFilter, setActiveFilter] = useState<ActiveFilter>('all')
  const [armedDelete, setArmedDelete] = useState('')

  useEffect(() => {
    if (!armedDelete) return
    function onDocClick(event: MouseEvent) {
      const target = event.target as HTMLElement | null
      if (target?.closest(`[data-armed-for="${armedDelete}"]`)) return
      setArmedDelete('')
    }
    const attach = window.setTimeout(() => {
      document.addEventListener('click', onDocClick)
    }, 0)
    const autoCancel = window.setTimeout(() => setArmedDelete(''), 3000)
    return () => {
      window.clearTimeout(attach)
      window.clearTimeout(autoCancel)
      document.removeEventListener('click', onDocClick)
    }
  }, [armedDelete])

  function handleDelete(qrId: string) {
    updateVault((current) => deleteQr(current, qrId))
    setArmedDelete('')
    if (selectedId === qrId) setSelectedId('')
  }
  const uncategorizedCount = getUncategorizedQrs(data).length
  const baseQrs =
    activeFilter === 'all'
      ? data.qrs
      : activeFilter === 'uncategorized'
        ? getUncategorizedQrs(data)
        : getQrsForCollection(data, activeFilter)
  const visibleQrs = searchQrs({ ...data, qrs: baseQrs }, search)
  const selectedQr = data.qrs.find((qr) => qr.id === selectedId) ?? visibleQrs[0]

  return (
    <div className="grid grid-cols-1 items-start gap-4 xl:grid-cols-[minmax(0,1fr)_420px]">
      <div className="space-y-4">
        <CollectionChipRow
          data={data}
          uncategorizedCount={uncategorizedCount}
          active={activeFilter}
          onChange={setActiveFilter}
        />
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <p className="text-muted-foreground text-xs font-medium tracking-wider uppercase">
              Local · Static · Private
            </p>
            <h1 className="text-3xl font-semibold tracking-tight">QR Vault</h1>
            <p className="text-muted-foreground text-sm">
              Deep-link QR codes, stored & shared on your own terms.
            </p>
          </div>
          <Button asChild>
            <Link to="/new" search={{ url: '', title: '', description: '' }}>
              <Plus /> New QR
            </Link>
          </Button>
        </div>

        <Card>
          <CardContent className="py-2">
            <div className="focus-within:border-ring focus-within:ring-ring/50 flex h-9 items-center gap-2 rounded-md border px-3 transition-colors focus-within:ring-3">
              <Search className="text-muted-foreground size-3.5 shrink-0" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search by title, path, or query keys…"
                className="placeholder:text-muted-foreground min-w-0 flex-1 bg-transparent text-sm outline-none"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  className="text-muted-foreground hover:text-foreground text-xs"
                >
                  clear
                </button>
              )}
            </div>
          </CardContent>
        </Card>

        <div className="space-y-2">
          <div className="flex items-center justify-between px-1">
            <p className="text-muted-foreground text-[10px] font-medium tracking-wider uppercase">
              {visibleQrs.length} {visibleQrs.length === 1 ? 'result' : 'results'}
            </p>
            {search && <Badge variant="outline">filtered</Badge>}
          </div>
          {visibleQrs.length ? (
            <div className="space-y-2">
              {visibleQrs.map((qr) => {
                const parsed = parseDeepLink(qr.url)
                const isSelected = qr.id === selectedQr?.id
                return (
                  <div key={qr.id} className="group relative">
                    <button
                      type="button"
                      onClick={() => setSelectedId(qr.id)}
                      className={cn(
                        'w-full rounded-lg border p-3.5 pr-24 text-left transition-colors',
                        isSelected
                          ? 'border-foreground/20 bg-muted/50'
                          : 'border-border bg-card hover:bg-muted/30',
                      )}
                    >
                      {isSelected && (
                        <div className="bg-foreground absolute top-3 bottom-3 left-0 w-0.5 rounded-r-full" />
                      )}
                      <div className="min-w-0">
                        <div className="mb-1 flex items-center gap-2">
                          <span
                            className={cn(
                              'size-1.5 rounded-full',
                              parsed.isValid ? 'bg-foreground' : 'bg-muted-foreground',
                            )}
                          />
                          <strong className="truncate text-sm font-medium">
                            {qr.title || parsed.path || qr.url}
                          </strong>
                        </div>
                        <p className="text-muted-foreground truncate pl-3.5 font-mono text-xs">
                          {parsed.path || qr.url}
                        </p>
                        {qr.description && (
                          <p className="text-muted-foreground mt-0.5 truncate pl-3.5 text-xs">
                            {qr.description}
                          </p>
                        )}
                      </div>
                    </button>
                    <div className="absolute top-1/2 right-2 flex -translate-y-1/2 items-center gap-1">
                      {armedDelete === qr.id ? (
                        <button
                          type="button"
                          data-armed-for={qr.id}
                          onClick={(event) => {
                            event.stopPropagation()
                            handleDelete(qr.id)
                          }}
                          className="text-destructive bg-destructive/10 border-destructive/40 hover:bg-destructive/20 flex h-9 items-center gap-1.5 rounded-md border px-3 text-xs font-medium transition-colors"
                          aria-label={`Confirm delete ${qr.title || parsed.path || 'QR'}`}
                        >
                          <Trash2 className="size-3.5" /> Confirm?
                        </button>
                      ) : (
                        <>
                          <Link
                            to="/share"
                            search={{
                              url: qr.url,
                              title: qr.title ?? '',
                              description: qr.description ?? '',
                            }}
                            title="Share"
                            aria-label={`Share ${qr.title || parsed.path || 'QR'}`}
                            className="text-muted-foreground hover:text-foreground hover:bg-background hover:border-border flex size-9 items-center justify-center rounded-md border border-transparent transition-colors"
                          >
                            <Share2 className="size-4" />
                          </Link>
                          <Link
                            to="/q/$qrId"
                            params={{ qrId: qr.id }}
                            title="Edit"
                            aria-label={`Edit ${qr.title || parsed.path || 'QR'}`}
                            className="text-muted-foreground hover:text-foreground hover:bg-background hover:border-border flex size-9 items-center justify-center rounded-md border border-transparent transition-colors"
                          >
                            <SquarePen className="size-4" />
                          </Link>
                          <button
                            type="button"
                            data-armed-for={qr.id}
                            onClick={(event) => {
                              event.stopPropagation()
                              setArmedDelete(qr.id)
                            }}
                            title="Delete"
                            aria-label={`Delete ${qr.title || parsed.path || 'QR'}`}
                            className="text-muted-foreground hover:text-destructive hover:bg-background hover:border-destructive/40 flex size-9 items-center justify-center rounded-md border border-transparent transition-colors"
                          >
                            <Trash2 className="size-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <Card>
              <CardContent className="py-10 text-center">
                <div className="mb-3 inline-flex size-12 items-center justify-center rounded-md border">
                  <Search className="text-muted-foreground size-4" />
                </div>
                <p className="mb-1 text-sm">No QR codes match</p>
                <p className="text-muted-foreground text-xs">
                  {search ? 'Try a different search term' : 'Create your first one'}
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      <div className="space-y-4 xl:sticky xl:top-0">
        {selectedQr ? (
          <>
            <QrPreview title={selectedQr.title} url={selectedQr.url} size="lg" />
            <Card>
              <CardHeader className="border-b">
                <div className="min-w-0">
                  <p className="text-muted-foreground mb-1 text-[10px] font-medium tracking-wider uppercase">
                    Selected
                  </p>
                  <CardTitle className="truncate">{selectedQr.title || 'Untitled QR'}</CardTitle>
                </div>
                <CardAction>
                  <Link
                    to="/q/$qrId"
                    params={{ qrId: selectedQr.id }}
                    className="text-muted-foreground hover:text-foreground flex shrink-0 items-center gap-1 text-xs font-medium"
                  >
                    Edit <ArrowRight className="size-3" />
                  </Link>
                </CardAction>
              </CardHeader>
              <CardContent className="space-y-3 pt-4">
                {selectedQr.description && (
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    {selectedQr.description}
                  </p>
                )}
                <p className="text-muted-foreground font-mono text-xs leading-relaxed break-all">
                  {selectedQr.url}
                </p>
              </CardContent>
            </Card>
            <ParsedUrlPanel url={selectedQr.url} />
          </>
        ) : (
          <Card>
            <CardContent className="space-y-4 py-10 text-center">
              <div className="inline-flex size-14 items-center justify-center rounded-md border">
                <Plus className="text-muted-foreground size-5" />
              </div>
              <div>
                <p className="mb-1 text-sm">Empty vault</p>
                <p className="text-muted-foreground text-xs">
                  {search ? 'No matching QR for current search' : 'Create your first deep-link QR'}
                </p>
              </div>
              <Link to="/new" search={{ url: '', title: '', description: '' }}>
                <Button type="button">
                  <Plus /> Create QR
                </Button>
              </Link>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}

type ActiveFilter = 'all' | 'uncategorized' | string

type CollectionChipRowProps = {
  data: VaultData
  uncategorizedCount: number
  active: ActiveFilter
  onChange: (next: ActiveFilter) => void
}

function CollectionChipRow({ data, uncategorizedCount, active, onChange }: CollectionChipRowProps) {
  return (
    <div className="-mx-1 flex items-center gap-2 overflow-x-auto px-1 pb-1">
      <Chip
        icon={<LayoutGrid className="size-3.5" />}
        label="All QR"
        count={data.qrs.length}
        active={active === 'all'}
        onClick={() => onChange('all')}
      />
      {uncategorizedCount > 0 && (
        <Chip
          icon={<Inbox className="size-3.5" />}
          label="Uncategorized"
          count={uncategorizedCount}
          active={active === 'uncategorized'}
          onClick={() => onChange('uncategorized')}
        />
      )}
      {data.collections.length > 0 && (
        <span aria-hidden className="bg-border mx-1 h-5 w-px shrink-0" />
      )}
      {data.collections.map((collection) => {
        const count = data.collectionItems.filter(
          (item) => item.collectionId === collection.id,
        ).length
        return (
          <Chip
            key={collection.id}
            label={collection.title}
            count={count}
            active={active === collection.id}
            onClick={() => onChange(collection.id)}
          />
        )
      })}
      <div className="ml-auto shrink-0">
        <Link
          to="/collections"
          aria-label="Manage collections"
          title="Manage collections"
          className="text-muted-foreground hover:text-foreground hover:bg-muted/50 hover:border-border flex size-8 items-center justify-center rounded-md border border-transparent transition-colors"
        >
          <Settings2 className="size-4" />
        </Link>
      </div>
    </div>
  )
}

type ChipProps = {
  icon?: React.ReactNode
  label: string
  count: number
  active: boolean
  onClick: () => void
}

function Chip({ icon, label, count, active, onClick }: ChipProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full border pr-2.5 pl-3 text-sm font-medium transition-colors',
        active
          ? 'bg-foreground text-background border-foreground'
          : 'bg-card text-muted-foreground border-border hover:text-foreground hover:bg-muted/50',
      )}
    >
      {icon && <span className="shrink-0">{icon}</span>}
      <span className="truncate">{label}</span>
      <span
        className={cn(
          'ml-0.5 font-mono text-[11px] tabular-nums',
          active ? 'text-background/70' : 'text-muted-foreground/80',
        )}
      >
        {count}
      </span>
    </button>
  )
}
