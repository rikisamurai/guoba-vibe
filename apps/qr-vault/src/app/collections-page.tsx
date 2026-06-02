import { Link, useNavigate, useRouterState } from '@tanstack/react-router'
import { ArrowRight, FolderOpen, Save, Trash2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'

import { useVault } from '@/app/use-vault'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardAction, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { type Collection, deleteCollection, upsertCollection } from '@/lib/storage'
import { parseDeepLink } from '@/lib/url'
import { useDocumentTitle } from '@/lib/use-document-title'
import { cn } from '@/lib/utils'
import { getQrsForCollection } from '@/lib/vault'

function FieldLabel({ htmlFor, children }: { htmlFor?: string; children: React.ReactNode }) {
  return (
    <Label
      htmlFor={htmlFor}
      className="text-muted-foreground text-[10px] font-medium tracking-wider uppercase"
    >
      {children}
    </Label>
  )
}

export function CollectionsPage() {
  const { data, updateVault } = useVault()
  const navigate = useNavigate()
  const pathname = useRouterState({ select: (state) => state.location.pathname })
  const collectionId = pathname.startsWith('/collections/')
    ? decodeURIComponent(pathname.slice('/collections/'.length))
    : ''
  const selectedCollection = data.collections.find((collection) => collection.id === collectionId)
  useDocumentTitle(selectedCollection ? `${selectedCollection.title} · Collections` : 'Collections')
  const qrs = selectedCollection ? getQrsForCollection(data, selectedCollection.id) : data.qrs
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [armedDeleteId, setArmedDeleteId] = useState('')

  useEffect(() => {
    setTitle(selectedCollection?.title ?? '')
    setDescription(selectedCollection?.description ?? '')
  }, [selectedCollection?.id, selectedCollection?.title, selectedCollection?.description])

  useEffect(() => {
    if (!armedDeleteId) return
    function onDocClick(event: MouseEvent) {
      const target = event.target as HTMLElement | null
      if (target?.closest(`[data-armed-for="${armedDeleteId}"]`)) return
      setArmedDeleteId('')
    }
    const attach = window.setTimeout(() => {
      document.addEventListener('click', onDocClick)
    }, 0)
    const autoCancel = window.setTimeout(() => setArmedDeleteId(''), 3000)
    return () => {
      window.clearTimeout(attach)
      window.clearTimeout(autoCancel)
      document.removeEventListener('click', onDocClick)
    }
  }, [armedDeleteId])

  function saveCollection() {
    if (!title.trim()) return
    updateVault((current) =>
      upsertCollection(current, { id: selectedCollection?.id, title, description }),
    )
    if (!selectedCollection) {
      setTitle('')
      setDescription('')
    }
  }

  function handleDelete(target: Collection) {
    const deletedItems = data.collectionItems.filter((item) => item.collectionId === target.id)
    updateVault((current) => deleteCollection(current, target.id))
    setArmedDeleteId('')
    if (collectionId === target.id) {
      void navigate({ to: '/collections' })
    }

    toast.success('Deleted collection', {
      action: {
        label: 'Undo',
        onClick: () => {
          updateVault((current) => {
            if (current.collections.some((collection) => collection.id === target.id)) {
              return current
            }
            const existingKeys = new Set(
              current.collectionItems.map((item) => `${item.collectionId}:${item.qrId}`),
            )
            const restoredItems = deletedItems.filter(
              (item) => !existingKeys.has(`${item.collectionId}:${item.qrId}`),
            )
            return {
              ...current,
              collections: [...current.collections, target],
              collectionItems: [...current.collectionItems, ...restoredItems],
            }
          })
          void navigate({
            to: '/collections/$collectionId',
            params: { collectionId: target.id },
          })
        },
      },
    })
  }

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="text-muted-foreground mb-1 text-xs font-medium tracking-wider uppercase">
            Workspace
          </p>
          <h1 className="text-3xl font-semibold tracking-tight">Collections</h1>
        </div>
        <Link
          to="/"
          className="text-muted-foreground hover:text-foreground flex items-center gap-1 text-xs font-medium"
        >
          Back to vault <ArrowRight className="size-3" />
        </Link>
      </div>

      <div className="grid grid-cols-1 items-start gap-4 xl:grid-cols-[220px_minmax(0,1fr)_minmax(0,1fr)]">
        <Card>
          <CardHeader className="border-b">
            <CardTitle>All folders</CardTitle>
            <CardAction>
              <Badge variant="outline">{data.collections.length}</Badge>
            </CardAction>
          </CardHeader>
          <CardContent className="space-y-1 pt-4">
            <TooltipProvider delayDuration={400}>
              {data.collections.map((collection) => {
                const isActive = collection.id === collectionId
                const isArmed = armedDeleteId === collection.id
                return (
                  <div key={collection.id} className="group relative">
                    <Link
                      to="/collections/$collectionId"
                      params={{ collectionId: collection.id }}
                      className={cn(
                        'flex items-center gap-2.5 truncate rounded-md py-2 pl-3 text-sm font-medium transition-[padding,background-color,color] duration-150',
                        isArmed ? 'pr-[92px]' : 'pr-3 group-focus-within:pr-9 group-hover:pr-9',
                        isActive
                          ? 'bg-accent text-accent-foreground'
                          : 'text-muted-foreground hover:text-foreground hover:bg-muted/50',
                      )}
                    >
                      <FolderOpen className="size-3.5 shrink-0" />
                      <span className="truncate">{collection.title}</span>
                    </Link>
                    <div
                      className={cn(
                        'absolute top-1/2 right-1.5 flex -translate-y-1/2 items-center transition-opacity',
                        isArmed
                          ? 'opacity-100'
                          : 'opacity-0 group-focus-within:opacity-100 group-hover:opacity-100',
                      )}
                    >
                      {isArmed ? (
                        <button
                          type="button"
                          data-armed-for={collection.id}
                          onClick={(event) => {
                            event.preventDefault()
                            event.stopPropagation()
                            handleDelete(collection)
                          }}
                          className="text-destructive bg-destructive/10 border-destructive/40 hover:bg-destructive/20 flex h-6 items-center gap-1.5 rounded-md border px-2 text-[11px] font-medium transition-colors"
                          aria-label={`Confirm delete ${collection.title}`}
                        >
                          <Trash2 className="size-3" /> Confirm?
                        </button>
                      ) : (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button
                              type="button"
                              data-armed-for={collection.id}
                              onClick={(event) => {
                                event.preventDefault()
                                event.stopPropagation()
                                setArmedDeleteId(collection.id)
                              }}
                              aria-label={`Delete ${collection.title}`}
                              className="text-muted-foreground hover:text-destructive hover:border-destructive/40 hover:bg-background flex size-6 items-center justify-center rounded-md border border-transparent transition-colors"
                            >
                              <Trash2 className="size-3" />
                            </button>
                          </TooltipTrigger>
                          <TooltipContent side="right">Delete folder</TooltipContent>
                        </Tooltip>
                      )}
                    </div>
                  </div>
                )
              })}
            </TooltipProvider>
            {!data.collections.length && (
              <p className="text-muted-foreground rounded-md border border-dashed px-3 py-4 text-center text-xs italic">
                no collections yet
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="border-b">
            <div>
              <p className="text-muted-foreground mb-1 text-[10px] font-medium tracking-wider uppercase">
                {selectedCollection ? 'Edit' : 'Create'}
              </p>
              <CardTitle>
                {selectedCollection ? selectedCollection.title : 'New collection'}
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4 pt-4">
            <div className="grid gap-1.5">
              <FieldLabel htmlFor="coll-title">Title</FieldLabel>
              <Input
                id="coll-title"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="e.g. Mobile onboarding"
              />
            </div>
            <div className="grid gap-1.5">
              <FieldLabel htmlFor="coll-desc">Description</FieldLabel>
              <Textarea
                id="coll-desc"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                rows={4}
                placeholder="Optional context for this collection"
              />
            </div>
            <Button type="button" onClick={saveCollection} disabled={!title.trim()}>
              <Save /> Save collection
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="border-b">
            <div>
              {selectedCollection && (
                <p className="text-muted-foreground mb-1 text-[10px] font-medium tracking-wider uppercase">
                  QRs in collection
                </p>
              )}
              <CardTitle>{selectedCollection?.title ?? 'All QR codes'}</CardTitle>
            </div>
            <CardAction>
              <Badge variant="secondary">{qrs.length}</Badge>
            </CardAction>
          </CardHeader>
          <CardContent className="space-y-2 pt-4">
            {qrs.length ? (
              qrs.map((qr) => {
                const parsed = parseDeepLink(qr.url)
                return (
                  <Link
                    key={qr.id}
                    to="/q/$qrId"
                    params={{ qrId: qr.id }}
                    className="bg-card hover:bg-muted/50 group block rounded-md border p-3 transition-colors"
                  >
                    <div className="mb-1 flex items-center gap-2">
                      <span
                        className={cn(
                          'size-1.5 shrink-0 rounded-full',
                          parsed.isValid ? 'bg-foreground' : 'bg-muted-foreground',
                        )}
                      />
                      <strong className="truncate text-sm font-medium group-hover:underline">
                        {qr.title || parsed.path || qr.url}
                      </strong>
                    </div>
                    <p className="text-muted-foreground truncate pl-3.5 font-mono text-xs">
                      {parsed.path || qr.url}
                    </p>
                  </Link>
                )
              })
            ) : (
              <p className="text-muted-foreground rounded-md border border-dashed px-3 py-6 text-center text-xs italic">
                no QR codes in this collection
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
