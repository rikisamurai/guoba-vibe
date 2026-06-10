import { Link } from '@tanstack/react-router'
import {
  ArrowRight,
  Check,
  Copy,
  Download,
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
import { type ReactElement, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { useVault } from '@/app/use-vault'
import { ParsedUrlPanel } from '@/components/parsed-url-panel'
import { QrPreview } from '@/components/qr-preview'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardAction, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { downloadDataUrl, qrFileName } from '@/lib/qr'
import { deleteQr, LAST_SAVED_QR_ID_KEY } from '@/lib/storage'
import type { VaultData } from '@/lib/storage'
import { buildShareUrl, parseDeepLink } from '@/lib/url'
import { useDocumentTitle } from '@/lib/use-document-title'
import { cn } from '@/lib/utils'
import { getQrsForCollection, getUncategorizedQrs, searchQrs, sortQrsByRecent } from '@/lib/vault'

export function WorkspacePage() {
  const { t } = useTranslation()
  useDocumentTitle(t('workspace.documentTitle'))
  const { data, updateVault } = useVault()
  const [search, setSearch] = useState('')
  const [selectedId, setSelectedId] = useState('')
  const [activeFilter, setActiveFilter] = useState<ActiveFilter>('all')
  const [armedDelete, setArmedDelete] = useState('')
  const [copiedUrlId, setCopiedUrlId] = useState('')
  const [copiedShareId, setCopiedShareId] = useState('')
  const [inspectorDataUrl, setInspectorDataUrl] = useState<string | null>(null)
  const [downloadedInspectorId, setDownloadedInspectorId] = useState('')
  const pendingSavedIdRef = useRef<string | null>(null)
  const listItemRefs = useRef(new Map<string, HTMLDivElement>())

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

  useEffect(() => {
    if (pendingSavedIdRef.current === null) {
      const id = sessionStorage.getItem(LAST_SAVED_QR_ID_KEY)
      if (id) sessionStorage.removeItem(LAST_SAVED_QR_ID_KEY)
      pendingSavedIdRef.current = id ?? ''
    }

    const pendingSavedId = pendingSavedIdRef.current
    if (!pendingSavedId) return
    if (!data.qrs.some((qr) => qr.id === pendingSavedId)) {
      pendingSavedIdRef.current = ''
      return
    }

    setSelectedId(pendingSavedId)
    const frame = window.requestAnimationFrame(() => {
      listItemRefs.current.get(pendingSavedId)?.scrollIntoView({ block: 'nearest' })
      pendingSavedIdRef.current = ''
    })

    return () => window.cancelAnimationFrame(frame)
  }, [data.qrs])

  function handleDelete(qrId: string) {
    const deletedQr = data.qrs.find((qr) => qr.id === qrId)
    const deletedCollectionItems = data.collectionItems.filter((item) => item.qrId === qrId)

    updateVault((current) => deleteQr(current, qrId))
    setArmedDelete('')
    if (selectedId === qrId) setSelectedId('')
    if (!deletedQr) return

    toast.success(t('toast.deletedQr'), {
      action: {
        label: t('toast.undo'),
        onClick: () => {
          updateVault((current) => {
            if (current.qrs.some((qr) => qr.id === deletedQr.id)) return current

            const existingItems = new Set(
              current.collectionItems.map((item) => `${item.collectionId}:${item.qrId}`),
            )
            const restoredItems = deletedCollectionItems.filter(
              (item) => !existingItems.has(`${item.collectionId}:${item.qrId}`),
            )

            return {
              ...current,
              qrs: [...current.qrs, deletedQr],
              collectionItems: [...current.collectionItems, ...restoredItems],
            }
          })
          setSelectedId(deletedQr.id)
        },
      },
    })
  }

  async function copyUrl(qr: VaultData['qrs'][number]) {
    try {
      await navigator.clipboard.writeText(qr.url)
      setCopiedUrlId(qr.id)
      toast.success(t('toast.copiedUrl'))
      window.setTimeout(() => setCopiedUrlId(''), 1200)
    } catch {
      toast.error(t('toast.couldNotCopyUrl'))
    }
  }

  async function copyShareUrl(qr: VaultData['qrs'][number]) {
    const shareUrl = buildShareUrl({
      origin: window.location.origin,
      pathname: window.location.pathname,
      url: qr.url,
      title: qr.title,
      description: qr.description,
    })
    try {
      await navigator.clipboard.writeText(shareUrl)
      setCopiedShareId(qr.id)
      toast.success(t('toast.copiedShareLink'))
      window.setTimeout(() => setCopiedShareId(''), 1200)
    } catch {
      toast.error(t('toast.couldNotCopyShareLink'))
    }
  }

  function downloadInspectorPng(qr: VaultData['qrs'][number]) {
    if (!inspectorDataUrl) return
    downloadDataUrl(inspectorDataUrl, qrFileName(qr.title))
    setDownloadedInspectorId(qr.id)
    window.setTimeout(() => setDownloadedInspectorId(''), 1200)
  }

  const uncategorizedCount = getUncategorizedQrs(data).length
  const baseQrs =
    activeFilter === 'all'
      ? data.qrs
      : activeFilter === 'uncategorized'
        ? getUncategorizedQrs(data)
        : getQrsForCollection(data, activeFilter)
  const visibleQrs = sortQrsByRecent(searchQrs({ ...data, qrs: baseQrs }, search))
  const selectedQr = data.qrs.find((qr) => qr.id === selectedId) ?? visibleQrs[0]
  const selectedParsed = selectedQr ? parseDeepLink(selectedQr.url) : null

  return (
    <div className="grid grid-cols-1 items-start gap-5 lg:h-[calc(100svh-5.5rem)] lg:grid-cols-[minmax(0,1fr)_360px] lg:items-stretch lg:overflow-hidden xl:grid-cols-[minmax(500px,1fr)_480px] 2xl:grid-cols-[minmax(560px,1fr)_560px]">
      <div className="flex min-h-0 flex-col gap-4 lg:h-full lg:overflow-hidden">
        <section className="shrink-0 space-y-4 border-b pb-4" aria-labelledby="workspace-title">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div className="min-w-0 space-y-1">
              <p className="text-muted-foreground text-[10px] font-medium tracking-wider uppercase">
                {t('workspace.statusLine')}
              </p>
              <h1
                id="workspace-title"
                className="text-2xl leading-tight font-semibold tracking-tight sm:text-3xl"
              >
                {t('common.vault')}
              </h1>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:auto-cols-fr sm:grid-flow-col sm:grid-cols-none">
              <SummaryPill label={t('common.qrCodes')} value={data.qrs.length} />
              <SummaryPill label={t('common.collections')} value={data.collections.length} />
            </div>
          </div>

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
                aria-label={t('workspace.searchLabel')}
                placeholder={t('workspace.searchPlaceholder')}
                className="placeholder:text-muted-foreground min-w-0 flex-1 bg-transparent text-sm outline-none"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  className="text-muted-foreground hover:text-foreground text-xs"
                >
                  {t('common.clear')}
                </button>
              )}
            </div>
            <Button asChild className="shrink-0 lg:w-auto">
              <Link to="/new" search={{ url: '', title: '', description: '' }}>
                <Plus /> {t('nav.newQr')}
              </Link>
            </Button>
          </div>

          <div className="text-muted-foreground flex flex-wrap items-center gap-x-3 gap-y-1 px-1 text-[10px] font-medium tracking-wider uppercase">
            <span>{t('workspace.resultCount', { count: visibleQrs.length })}</span>
            {search && (
              <Badge variant="outline" className="h-5 px-1.5 text-[10px] tracking-normal">
                {t('workspace.filtered')}
              </Badge>
            )}
          </div>
        </section>

        <div className="min-h-0 space-y-2 lg:flex-1 lg:[scrollbar-gutter:stable] lg:overflow-y-auto lg:pr-3">
          {visibleQrs.length ? (
            <div className="space-y-2">
              {visibleQrs.map((qr) => {
                const parsed = parseDeepLink(qr.url)
                const isSelected = qr.id === selectedQr?.id
                return (
                  <div
                    key={qr.id}
                    ref={(node) => {
                      if (node) {
                        listItemRefs.current.set(qr.id, node)
                      } else {
                        listItemRefs.current.delete(qr.id)
                      }
                    }}
                    className="group relative"
                  >
                    <button
                      type="button"
                      onClick={() => setSelectedId(qr.id)}
                      className={cn(
                        'w-full rounded-lg border px-3.5 py-3.5 pr-32 text-left shadow-sm shadow-transparent transition-all duration-200 sm:pr-28',
                        isSelected
                          ? 'border-foreground bg-card shadow-[0_0_0_1px_var(--foreground)]'
                          : 'border-border bg-card hover:border-foreground/25 hover:bg-muted/20 hover:shadow-foreground/5',
                      )}
                    >
                      <div className="min-w-0">
                        <div className="mb-1.5 flex min-w-0 items-center gap-2">
                          <span
                            className={cn(
                              'size-1.5 rounded-full',
                              parsed.isValid ? 'bg-foreground' : 'bg-muted-foreground/50',
                            )}
                          />
                          <strong className="truncate text-sm font-semibold">
                            {qr.title || parsed.path || qr.url}
                          </strong>
                          {parsed.scheme && (
                            <span className="text-muted-foreground bg-background/70 rounded px-1.5 py-0.5 font-mono text-[10px]">
                              {parsed.scheme}
                            </span>
                          )}
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
                    <div className="absolute top-1/2 right-1.5 flex -translate-y-1/2 items-center gap-1 opacity-75 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100 sm:right-2">
                      {armedDelete === qr.id ? (
                        <button
                          type="button"
                          data-armed-for={qr.id}
                          onClick={(event) => {
                            event.stopPropagation()
                            handleDelete(qr.id)
                          }}
                          className="text-destructive bg-destructive/10 border-destructive/40 hover:bg-destructive/20 flex h-10 items-center gap-1.5 rounded-md border px-2.5 text-xs font-medium transition-colors sm:h-8"
                          aria-label={t('workspace.confirmDelete', {
                            name: qr.title || parsed.path || t('common.qrFallback'),
                          })}
                        >
                          <Trash2 className="size-3.5" /> {t('common.confirm')}
                        </button>
                      ) : (
                        <>
                          <ActionTooltip label={t('common.copyUrl')}>
                            <button
                              type="button"
                              onClick={(event) => {
                                event.stopPropagation()
                                void copyUrl(qr)
                              }}
                              aria-label={t('workspace.copyUrlFor', {
                                name: qr.title || parsed.path || t('common.qrFallback'),
                              })}
                              className="text-muted-foreground hover:text-foreground hover:border-border bg-background/80 flex size-10 items-center justify-center rounded-md border border-transparent shadow-sm transition-colors sm:size-8"
                            >
                              {copiedUrlId === qr.id ? (
                                <Check className="size-4" />
                              ) : (
                                <Copy className="size-4" />
                              )}
                            </button>
                          </ActionTooltip>
                          <ActionTooltip label={t('common.edit')}>
                            <Link
                              to="/q/$qrId"
                              params={{ qrId: qr.id }}
                              aria-label={t('workspace.editQr', {
                                name: qr.title || parsed.path || t('common.qrFallback'),
                              })}
                              className="text-muted-foreground hover:text-foreground hover:border-border bg-background/80 flex size-10 items-center justify-center rounded-md border border-transparent shadow-sm transition-colors sm:size-8"
                            >
                              <SquarePen className="size-4" />
                            </Link>
                          </ActionTooltip>
                          <ActionTooltip label={t('common.delete')}>
                            <button
                              type="button"
                              data-armed-for={qr.id}
                              onClick={(event) => {
                                event.stopPropagation()
                                setArmedDelete(qr.id)
                              }}
                              aria-label={t('workspace.deleteQr', {
                                name: qr.title || parsed.path || t('common.qrFallback'),
                              })}
                              className="text-muted-foreground hover:text-destructive hover:border-destructive/40 bg-background/80 flex size-10 items-center justify-center rounded-md border border-transparent shadow-sm transition-colors sm:size-8"
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
                <p className="mb-1 text-sm">{t('workspace.noMatches')}</p>
                <p className="text-muted-foreground text-xs">
                  {search ? t('workspace.tryDifferentSearch') : t('workspace.createFirstOne')}
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      <aside className="min-h-0 space-y-3 lg:h-full lg:[scrollbar-gutter:stable] lg:overflow-y-auto lg:pt-px lg:pr-3 lg:pb-1 lg:pl-px">
        {selectedQr ? (
          <>
            <Card size="sm" className="shadow-foreground/5 shadow-sm">
              <CardHeader className="bg-muted/20 border-b">
                <div className="min-w-0 space-y-1">
                  <p className="text-muted-foreground mb-1 text-[10px] font-medium tracking-wider uppercase">
                    {t('common.selectedQr')}
                  </p>
                  <CardTitle className="truncate text-base">
                    {selectedQr.title || t('common.untitledQr')}
                  </CardTitle>
                  <p className="text-muted-foreground truncate font-mono text-[11px]">
                    {selectedParsed?.path || selectedQr.url}
                  </p>
                </div>
                <CardAction className="flex items-center gap-1">
                  <ActionTooltip label={t('common.downloadPng')}>
                    <button
                      type="button"
                      onClick={() => downloadInspectorPng(selectedQr)}
                      disabled={!inspectorDataUrl}
                      aria-label={t('workspace.downloadPngFor', {
                        name: selectedQr.title || selectedParsed?.path || t('common.qrFallback'),
                      })}
                      className="text-muted-foreground hover:text-foreground hover:bg-muted/50 disabled:hover:text-muted-foreground flex size-8 shrink-0 items-center justify-center rounded-md border border-transparent transition-colors disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent"
                    >
                      {downloadedInspectorId === selectedQr.id ? (
                        <Check className="size-4" />
                      ) : (
                        <Download className="size-4" />
                      )}
                    </button>
                  </ActionTooltip>
                  <ActionTooltip label={t('common.copyShareLink')}>
                    <button
                      type="button"
                      onClick={() => void copyShareUrl(selectedQr)}
                      aria-label={t('workspace.copyShareLinkFor', {
                        name: selectedQr.title || selectedParsed?.path || t('common.qrFallback'),
                      })}
                      className="text-muted-foreground hover:text-foreground hover:bg-muted/50 flex size-8 shrink-0 items-center justify-center rounded-md border border-transparent transition-colors"
                    >
                      {copiedShareId === selectedQr.id ? (
                        <Check className="size-4" />
                      ) : (
                        <Share2 className="size-4" />
                      )}
                    </button>
                  </ActionTooltip>
                  <ActionTooltip label={t('workspace.openSharePage')}>
                    <Link
                      to="/share"
                      search={{
                        url: selectedQr.url,
                        title: selectedQr.title ?? '',
                        description: selectedQr.description ?? '',
                      }}
                      aria-label={t('workspace.openSharePageFor', {
                        name: selectedQr.title || selectedParsed?.path || t('common.qrFallback'),
                      })}
                      className="text-muted-foreground hover:text-foreground hover:bg-muted/50 flex size-8 shrink-0 items-center justify-center rounded-md border border-transparent transition-colors"
                    >
                      <ExternalLink className="size-4" />
                    </Link>
                  </ActionTooltip>
                  <Link
                    to="/q/$qrId"
                    params={{ qrId: selectedQr.id }}
                    className="text-muted-foreground hover:text-foreground hover:bg-background/80 flex shrink-0 items-center gap-1 rounded-md px-1.5 py-1 text-xs font-medium transition-colors"
                  >
                    {t('common.edit')} <ArrowRight className="size-3" />
                  </Link>
                </CardAction>
              </CardHeader>
              <CardContent className="space-y-4 pt-4">
                <div className="bg-background rounded-lg border p-6">
                  <QrPreview
                    title={selectedQr.title}
                    url={selectedQr.url}
                    size="inspector"
                    bare
                    onDataUrl={setInspectorDataUrl}
                  />
                </div>
                {selectedQr.description && (
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    {selectedQr.description}
                  </p>
                )}
                <div className="bg-muted/40 rounded-lg border p-3">
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
                <p className="mb-1 text-sm">{t('workspace.emptyVault')}</p>
                <p className="text-muted-foreground text-xs">
                  {search ? t('workspace.noMatchingQr') : t('workspace.createFirstDeeplinkQr')}
                </p>
              </div>
              <Link to="/new" search={{ url: '', title: '', description: '' }}>
                <Button type="button">
                  <Plus /> {t('workspace.createQr')}
                </Button>
              </Link>
            </CardContent>
          </Card>
        )}
      </aside>
    </div>
  )
}

function SummaryPill({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-card text-card-foreground shadow-foreground/5 min-w-0 rounded-lg border px-3 py-2 shadow-sm">
      <div className="font-mono text-lg leading-none font-semibold tabular-nums">{value}</div>
      <div className="text-muted-foreground mt-1 truncate text-[10px] font-medium tracking-wider uppercase">
        {label}
      </div>
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
  const { t } = useTranslation()

  return (
    <div className="flex flex-wrap items-center gap-2 px-1 pb-3 sm:-mx-1 sm:[scrollbar-gutter:stable] sm:flex-nowrap sm:overflow-x-auto">
      <Chip
        icon={<LayoutGrid className="size-3.5" />}
        label={t('common.allQr')}
        count={data.qrs.length}
        active={active === 'all'}
        onClick={() => onChange('all')}
      />
      {uncategorizedCount > 0 && (
        <Chip
          icon={<Inbox className="size-3.5" />}
          label={t('workspace.uncategorized')}
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
          aria-label={t('workspace.manageCollections')}
          title={t('workspace.manageCollections')}
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
        'inline-flex h-8 max-w-full shrink-0 items-center gap-1.5 rounded-full border pr-2.5 pl-3 text-sm font-medium transition-colors sm:max-w-none',
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
