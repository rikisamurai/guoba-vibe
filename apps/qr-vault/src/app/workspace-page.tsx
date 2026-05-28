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
import { useDocumentTitle } from '@/lib/use-document-title'
import { ParsedUrlPanel } from '@/components/parsed-url-panel'
import { QrPreview } from '@/components/qr-preview'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardAction, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useVault } from '@/app/use-vault'
import { cn } from '@/lib/utils'
import { parseDeepLink } from '@/lib/url'
import { getQrsForCollection, getUncategorizedQrs, searchQrs } from '@/lib/vault'
import { deleteQr } from '@/lib/storage'
import type { VaultData } from '@/lib/storage'

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
    <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_420px] gap-4 items-start">
      <div className="space-y-4">
        <CollectionChipRow
          data={data}
          uncategorizedCount={uncategorizedCount}
          active={activeFilter}
          onChange={setActiveFilter}
        />
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <p className="text-xs uppercase tracking-wider font-medium text-muted-foreground">
              Local · Static · Private
            </p>
            <h1 className="text-3xl font-semibold tracking-tight">QR Vault</h1>
            <p className="text-sm text-muted-foreground">
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
            <div className="flex items-center gap-2 px-3 h-9 rounded-md border focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50 transition-colors">
              <Search className="size-3.5 text-muted-foreground shrink-0" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search by title, path, or query keys…"
                className="flex-1 min-w-0 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  className="text-xs text-muted-foreground hover:text-foreground"
                >
                  clear
                </button>
              )}
            </div>
          </CardContent>
        </Card>

        <div className="space-y-2">
          <div className="flex items-center justify-between px-1">
            <p className="text-[10px] uppercase tracking-wider font-medium text-muted-foreground">
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
                  <div key={qr.id} className="relative group">
                    <button
                      type="button"
                      onClick={() => setSelectedId(qr.id)}
                      className={cn(
                        'w-full text-left p-3.5 pr-24 rounded-lg border transition-colors',
                        isSelected
                          ? 'border-foreground/20 bg-muted/50'
                          : 'border-border bg-card hover:bg-muted/30',
                      )}
                    >
                      {isSelected && (
                        <div className="absolute left-0 top-3 bottom-3 w-0.5 bg-foreground rounded-r-full" />
                      )}
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span
                            className={cn(
                              'size-1.5 rounded-full',
                              parsed.isValid ? 'bg-foreground' : 'bg-muted-foreground',
                            )}
                          />
                          <strong className="text-sm font-medium truncate">
                            {qr.title || parsed.path || qr.url}
                          </strong>
                        </div>
                        <p className="text-xs font-mono text-muted-foreground truncate pl-3.5">
                          {parsed.path || qr.url}
                        </p>
                        {qr.description && (
                          <p className="text-xs text-muted-foreground truncate pl-3.5 mt-0.5">
                            {qr.description}
                          </p>
                        )}
                      </div>
                    </button>
                    <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                      {armedDelete === qr.id ? (
                        <button
                          type="button"
                          data-armed-for={qr.id}
                          onClick={(event) => {
                            event.stopPropagation()
                            handleDelete(qr.id)
                          }}
                          className="h-9 px-3 rounded-md flex items-center gap-1.5 text-xs font-medium text-destructive bg-destructive/10 border border-destructive/40 hover:bg-destructive/20 transition-colors"
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
                            className="size-9 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-background border border-transparent hover:border-border transition-colors"
                          >
                            <Share2 className="size-4" />
                          </Link>
                          <Link
                            to="/q/$qrId"
                            params={{ qrId: qr.id }}
                            title="Edit"
                            aria-label={`Edit ${qr.title || parsed.path || 'QR'}`}
                            className="size-9 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-background border border-transparent hover:border-border transition-colors"
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
                            className="size-9 rounded-md flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-background border border-transparent hover:border-destructive/40 transition-colors"
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
                <div className="inline-flex size-12 rounded-md border items-center justify-center mb-3">
                  <Search className="size-4 text-muted-foreground" />
                </div>
                <p className="text-sm mb-1">No QR codes match</p>
                <p className="text-xs text-muted-foreground">
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
                  <p className="text-[10px] uppercase tracking-wider font-medium text-muted-foreground mb-1">
                    Selected
                  </p>
                  <CardTitle className="truncate">{selectedQr.title || 'Untitled QR'}</CardTitle>
                </div>
                <CardAction>
                  <Link
                    to="/q/$qrId"
                    params={{ qrId: selectedQr.id }}
                    className="text-xs text-muted-foreground hover:text-foreground font-medium flex items-center gap-1 shrink-0"
                  >
                    Edit <ArrowRight className="size-3" />
                  </Link>
                </CardAction>
              </CardHeader>
              <CardContent className="pt-4 space-y-3">
                {selectedQr.description && (
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {selectedQr.description}
                  </p>
                )}
                <p className="text-xs font-mono text-muted-foreground break-all leading-relaxed">
                  {selectedQr.url}
                </p>
              </CardContent>
            </Card>
            <ParsedUrlPanel url={selectedQr.url} />
          </>
        ) : (
          <Card>
            <CardContent className="py-10 text-center space-y-4">
              <div className="inline-flex size-14 rounded-md border items-center justify-center">
                <Plus className="size-5 text-muted-foreground" />
              </div>
              <div>
                <p className="text-sm mb-1">Empty vault</p>
                <p className="text-xs text-muted-foreground">
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
    <div className="flex items-center gap-2 overflow-x-auto -mx-1 px-1 pb-1">
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
        <span aria-hidden className="h-5 w-px bg-border shrink-0 mx-1" />
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
          className="size-8 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/50 border border-transparent hover:border-border transition-colors"
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
        'shrink-0 inline-flex items-center gap-1.5 h-8 pl-3 pr-2.5 rounded-full text-sm font-medium transition-colors border',
        active
          ? 'bg-foreground text-background border-foreground'
          : 'bg-card text-muted-foreground border-border hover:text-foreground hover:bg-muted/50',
      )}
    >
      {icon && <span className="shrink-0">{icon}</span>}
      <span className="truncate">{label}</span>
      <span
        className={cn(
          'ml-0.5 text-[11px] font-mono tabular-nums',
          active ? 'text-background/70' : 'text-muted-foreground/80',
        )}
      >
        {count}
      </span>
    </button>
  )
}
