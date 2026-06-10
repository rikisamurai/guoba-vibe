import { Link, useNavigate, useRouterState } from '@tanstack/react-router'
import { ArrowRight, FolderOpen, Plus, Save, Trash2 } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { useVault } from '@/app/use-vault'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardAction,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
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
  const { t } = useTranslation()
  const { data, updateVault } = useVault()
  const navigate = useNavigate()
  const pathname = useRouterState({ select: (state) => state.location.pathname })
  const collectionId = pathname.startsWith('/collections/')
    ? decodeURIComponent(pathname.slice('/collections/'.length))
    : ''
  const selectedCollection = data.collections.find((collection) => collection.id === collectionId)
  useDocumentTitle(
    selectedCollection
      ? t('collections.documentDetail', { title: selectedCollection.title })
      : t('collections.documentTitle'),
  )
  const qrs = selectedCollection ? getQrsForCollection(data, selectedCollection.id) : []
  const collectionCounts = data.collectionItems.reduce<Record<string, number>>((counts, item) => {
    counts[item.collectionId] = (counts[item.collectionId] ?? 0) + 1
    return counts
  }, {})
  const titleRef = useRef<HTMLInputElement>(null)
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

  function startNewCollection() {
    setArmedDeleteId('')
    setTitle('')
    setDescription('')
    if (collectionId) {
      void navigate({ to: '/collections' })
    }
    window.setTimeout(() => titleRef.current?.focus(), 0)
  }

  function handleDelete(target: Collection) {
    const deletedItems = data.collectionItems.filter((item) => item.collectionId === target.id)
    updateVault((current) => deleteCollection(current, target.id))
    setArmedDeleteId('')
    if (collectionId === target.id) {
      void navigate({ to: '/collections' })
    }

    toast.success(t('collections.deletedToast'), {
      action: {
        label: t('toast.undo'),
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
            {t('collections.eyebrow')}
          </p>
          <h1 className="text-3xl font-semibold tracking-tight">{t('common.collections')}</h1>
        </div>
        <Link
          to="/"
          className="text-muted-foreground hover:text-foreground flex items-center gap-1 text-xs font-medium"
        >
          {t('collections.backToVault')} <ArrowRight className="size-3" />
        </Link>
      </div>

      <Card>
        <CardHeader className="border-b">
          <CardTitle>{t('collections.allFolders')}</CardTitle>
          <CardAction className="flex items-center gap-2">
            <Badge variant="outline">{data.collections.length}</Badge>
            <Button type="button" size="sm" onClick={startNewCollection}>
              <Plus /> {t('collections.newCollection')}
            </Button>
          </CardAction>
        </CardHeader>
        <CardContent className="pt-4">
          {data.collections.length ? (
            <div className="flex flex-wrap gap-2 overflow-visible">
              {data.collections.map((collection) => {
                const isActive = collection.id === collectionId
                return (
                  <Link
                    key={collection.id}
                    to="/collections/$collectionId"
                    params={{ collectionId: collection.id }}
                    className={cn(
                      'group bg-card inline-flex max-w-full items-center gap-2 rounded-md border px-3 py-2 text-sm font-medium transition-colors',
                      isActive
                        ? 'border-foreground shadow-[0_0_0_1px_var(--foreground)]'
                        : 'border-border hover:bg-muted/50',
                    )}
                  >
                    <FolderOpen className="size-3.5 shrink-0" />
                    <span className="min-w-0 truncate">{collection.title}</span>
                    <span className="text-muted-foreground font-mono text-[10px]">
                      {collectionCounts[collection.id] ?? 0}
                    </span>
                  </Link>
                )
              })}
            </div>
          ) : (
            <p className="text-muted-foreground rounded-md border border-dashed px-3 py-4 text-center text-xs italic">
              {t('collections.noCollections')}
            </p>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 items-start gap-4 xl:grid-cols-[minmax(320px,380px)_minmax(0,1fr)]">
        <Card>
          <CardHeader className="border-b">
            <div className="min-w-0">
              <p className="text-muted-foreground mb-1 text-[10px] font-medium tracking-wider uppercase">
                {selectedCollection ? t('collections.edit') : t('collections.create')}
              </p>
              <CardTitle className="truncate">
                {selectedCollection ? selectedCollection.title : t('collections.newCollection')}
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4 pt-4">
            <div className="grid gap-1.5">
              <FieldLabel htmlFor="coll-title">{t('common.title')}</FieldLabel>
              <Input
                id="coll-title"
                ref={titleRef}
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder={t('collections.titlePlaceholder')}
              />
            </div>
            <div className="grid gap-1.5">
              <FieldLabel htmlFor="coll-desc">{t('common.description')}</FieldLabel>
              <Textarea
                id="coll-desc"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                rows={4}
                placeholder={t('collections.descriptionPlaceholder')}
              />
            </div>
          </CardContent>
          <CardFooter
            className={cn(
              'flex-wrap gap-3 bg-transparent',
              selectedCollection ? 'justify-between' : 'justify-end',
            )}
          >
            {selectedCollection && (
              <div className="flex items-center">
                {armedDeleteId === selectedCollection.id ? (
                  <Button
                    type="button"
                    variant="destructive"
                    data-armed-for={selectedCollection.id}
                    onClick={() => handleDelete(selectedCollection)}
                    aria-label={t('collections.confirmDelete', {
                      name: selectedCollection.title,
                    })}
                  >
                    <Trash2 /> {t('common.confirm')}
                  </Button>
                ) : (
                  <Button
                    type="button"
                    variant="outline"
                    data-armed-for={selectedCollection.id}
                    onClick={() => setArmedDeleteId(selectedCollection.id)}
                    aria-label={t('collections.deleteCollection', {
                      name: selectedCollection.title,
                    })}
                  >
                    <Trash2 /> {t('common.delete')}
                  </Button>
                )}
              </div>
            )}
            <Button type="button" onClick={saveCollection} disabled={!title.trim()}>
              <Save /> {t('collections.saveCollection')}
            </Button>
          </CardFooter>
        </Card>

        {selectedCollection ? (
          <Card>
            <CardHeader className="border-b">
              <div>
                <p className="text-muted-foreground mb-1 text-[10px] font-medium tracking-wider uppercase">
                  {t('collections.qrsInCollection')}
                </p>
                <CardTitle>{selectedCollection.title}</CardTitle>
              </div>
              <CardAction>
                <Badge variant="secondary">{qrs.length}</Badge>
              </CardAction>
            </CardHeader>
            <CardContent className="pt-4">
              {qrs.length ? (
                <div className="grid gap-2 md:grid-cols-2">
                  {qrs.map((qr) => {
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
                  })}
                </div>
              ) : (
                <p className="text-muted-foreground rounded-md border border-dashed px-3 py-6 text-center text-xs italic">
                  {t('collections.noQrsInCollection')}
                </p>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="text-muted-foreground bg-muted/20 rounded-lg border border-dashed px-4 py-3 text-xs">
            {t('collections.saveBeforeAssigning')}
          </div>
        )}
      </div>
    </div>
  )
}
