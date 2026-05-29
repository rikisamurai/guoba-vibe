import { Link } from '@tanstack/react-router'
import {
  ArrowRight,
  Check,
  Copy,
  ExternalLink,
  Inbox,
  LayoutGrid,
  Plus,
  Search,
  Settings2,
  Share2,
  SquarePen,
  Trash2,
} from 'lucide-react'
import { type ReactElement, useEffect, useState } from 'react'

import { useVault } from '@/app/use-vault'
import { ParsedUrlPanel } from '@/components/parsed-url-panel'
import { QrPreview } from '@/components/qr-preview'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardAction, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { deleteQr } from '@/lib/storage'
import type { VaultData } from '@/lib/storage'
import { buildShareUrl, parseDeepLink } from '@/lib/url'
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
  const [copiedUrlId, setCopiedUrlId] = useState('')
  const [copiedShareId, setCopiedShareId] = useState('')

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

  async function copyUrl(qr: VaultData['qrs'][number]) {
    await navigator.clipboard.writeText(qr.url)
    setCopiedUrlId(qr.id)
    window.setTimeout(() => setCopiedUrlId(''), 1200)
  }

  async function copyShareUrl(qr: VaultData['qrs'][number]) {
    const shareUrl = buildShareUrl({
      origin: window.location.origin,
      pathname: window.location.pathname,
      url: qr.url,
      title: qr.title,
      description: qr.description,
    })
    await navigator.clipboard.writeText(shareUrl)
    setCopiedShareId(qr.id)
    window.setTimeout(() => setCopiedShareId(''), 1200)
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
  const selectedParsed = selectedQr ? parseDeepLink(selectedQr.url) : null

  return (
    <div className="grid grid-cols-1 items-start gap-5 xl:grid-cols-[minmax(500px,1fr)_480px] 2xl:grid-cols-[minmax(560px,1fr)_560px]">
      <div className="space-y-3">
        <h1 className="sr-only">QR Vault</h1>
        <div className="space-y-3 border-b pb-4">
          <CollectionChipRow
            data={data}
            uncategorizedCount={uncategorizedCount}
            active={activeFilter}
            onChange={setActiveFilter}
          />

          <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
            <div className="focus-within:border-ring focus-within:ring-ring/50 bg-card flex h-10 min-w-0 flex-1 items-center gap-2 rounded-md border px-3 transition-colors focus-within:ring-3">
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
            <Button asChild className="shrink-0 lg:w-auto">
              <Link to="/new" search={{ url: '', title: '', description: '' }}>
                <Plus /> New QR
              </Link>
            </Button>
          </div>

          <div className="text-muted-foreground flex flex-wrap items-center gap-x-3 gap-y-1 px-1 text-[10px] font-medium tracking-wider uppercase">
            <span>Local · Static · Private</span>
            <span aria-hidden>·</span>
            <span>
              {visibleQrs.length} {visibleQrs.length === 1 ? 'result' : 'results'}
            </span>
            {search && (
              <Badge variant="outline" className="h-5 px-1.5 text-[10px] tracking-normal">
                filtered
              </Badge>
            )}
          </div>
        </div>

        <div className="space-y-2">
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
                        'w-full rounded-md border px-3 py-3 pr-24 text-left transition-colors',
                        isSelected
                          ? 'border-foreground/25 bg-muted/45 shadow-[inset_2px_0_0_var(--foreground)]'
                          : 'border-border bg-card hover:bg-muted/30',
                      )}
                    >
                      {isSelected && (
                        <div className="bg-foreground absolute top-2.5 bottom-2.5 left-0 w-0.5 rounded-r-full" />
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
                    <div className="absolute top-1/2 right-2 flex -translate-y-1/2 items-center gap-0.5 opacity-75 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100">
                      {armedDelete === qr.id ? (
                        <button
                          type="button"
                          data-armed-for={qr.id}
                          onClick={(event) => {
                            event.stopPropagation()
                            handleDelete(qr.id)
                          }}
                          className="text-destructive bg-destructive/10 border-destructive/40 hover:bg-destructive/20 flex h-8 items-center gap-1.5 rounded-md border px-2.5 text-xs font-medium transition-colors"
                          aria-label={`Confirm delete ${qr.title || parsed.path || 'QR'}`}
                        >
                          <Trash2 className="size-3.5" /> Confirm?
                        </button>
                      ) : (
                        <>
                          <ActionTooltip label="Copy URL">
                            <button
                              type="button"
                              onClick={(event) => {
                                event.stopPropagation()
                                void copyUrl(qr)
                              }}
                              aria-label={`Copy URL for ${qr.title || parsed.path || 'QR'}`}
                              className="text-muted-foreground hover:text-foreground hover:bg-background hover:border-border flex size-8 items-center justify-center rounded-md border border-transparent transition-colors"
                            >
                              {copiedUrlId === qr.id ? (
                                <Check className="size-4" />
                              ) : (
                                <Copy className="size-4" />
                              )}
                            </button>
                          </ActionTooltip>
                          <ActionTooltip label="Edit">
                            <Link
                              to="/q/$qrId"
                              params={{ qrId: qr.id }}
                              aria-label={`Edit ${qr.title || parsed.path || 'QR'}`}
                              className="text-muted-foreground hover:text-foreground hover:bg-background hover:border-border flex size-8 items-center justify-center rounded-md border border-transparent transition-colors"
                            >
                              <SquarePen className="size-4" />
                            </Link>
                          </ActionTooltip>
                          <ActionTooltip label="Delete">
                            <button
                              type="button"
                              data-armed-for={qr.id}
                              onClick={(event) => {
                                event.stopPropagation()
                                setArmedDelete(qr.id)
                              }}
                              aria-label={`Delete ${qr.title || parsed.path || 'QR'}`}
                              className="text-muted-foreground hover:text-destructive hover:bg-background hover:border-destructive/40 flex size-8 items-center justify-center rounded-md border border-transparent transition-colors"
                            >
                              <Trash2 className="size-4" />
                            </button>
                          </ActionTooltip>
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

      <aside className="space-y-3 xl:sticky xl:top-0">
        {selectedQr ? (
          <>
            <Card size="sm">
              <CardHeader className="border-b">
                <div className="min-w-0 space-y-1">
                  <p className="text-muted-foreground mb-1 text-[10px] font-medium tracking-wider uppercase">
                    Selected QR
                  </p>
                  <CardTitle className="truncate text-base">
                    {selectedQr.title || 'Untitled QR'}
                  </CardTitle>
                  <p className="text-muted-foreground truncate font-mono text-[11px]">
                    {selectedParsed?.path || selectedQr.url}
                  </p>
                </div>
                <CardAction className="flex items-center gap-1">
                  <ActionTooltip label="Copy share link">
                    <button
                      type="button"
                      onClick={() => void copyShareUrl(selectedQr)}
                      aria-label={`Copy share link for ${selectedQr.title || selectedParsed?.path || 'QR'}`}
                      className="text-muted-foreground hover:text-foreground hover:bg-muted/50 flex size-8 shrink-0 items-center justify-center rounded-md border border-transparent transition-colors"
                    >
                      {copiedShareId === selectedQr.id ? (
                        <Check className="size-4" />
                      ) : (
                        <Share2 className="size-4" />
                      )}
                    </button>
                  </ActionTooltip>
                  <ActionTooltip label="Open share page">
                    <Link
                      to="/share"
                      search={{
                        url: selectedQr.url,
                        title: selectedQr.title ?? '',
                        description: selectedQr.description ?? '',
                      }}
                      aria-label={`Open share page for ${selectedQr.title || selectedParsed?.path || 'QR'}`}
                      className="text-muted-foreground hover:text-foreground hover:bg-muted/50 flex size-8 shrink-0 items-center justify-center rounded-md border border-transparent transition-colors"
                    >
                      <ExternalLink className="size-4" />
                    </Link>
                  </ActionTooltip>
                  <Link
                    to="/q/$qrId"
                    params={{ qrId: selectedQr.id }}
                    className="text-muted-foreground hover:text-foreground flex shrink-0 items-center gap-1 text-xs font-medium"
                  >
                    Edit <ArrowRight className="size-3" />
                  </Link>
                </CardAction>
              </CardHeader>
              <CardContent className="space-y-4 pt-3">
                <QrPreview title={selectedQr.title} url={selectedQr.url} size="inspector" bare />
                {selectedQr.description && (
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    {selectedQr.description}
                  </p>
                )}
                <div className="bg-muted/40 rounded-md border p-3">
                  <p className="text-muted-foreground font-mono text-xs leading-relaxed break-all">
                    {selectedQr.url}
                  </p>
                </div>
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
      </aside>
    </div>
  )
}

function ActionTooltip({ label, children }: { label: string; children: ReactElement }) {
  return (
    <TooltipProvider delayDuration={1000}>
      <Tooltip>
        <TooltipTrigger asChild>{children}</TooltipTrigger>
        <TooltipContent>{label}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
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
