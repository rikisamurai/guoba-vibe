import { Link, useNavigate, useRouterState } from '@tanstack/react-router'
import { ArrowRight } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { CollectionFormCard } from '@/app/collections/collection-form-card'
import { CollectionListCard } from '@/app/collections/collection-list-card'
import { CollectionQrCard } from '@/app/collections/collection-qr-card'
import { useVault } from '@/app/use-vault'
import { type Collection, deleteCollection, upsertCollection } from '@/lib/storage'
import { useDocumentTitle } from '@/lib/use-document-title'
import { getQrsForCollection } from '@/lib/vault'

export function CollectionsPage() {
  const { t } = useTranslation()
  const { data, updateVault } = useVault()
  const navigate = useNavigate()
  const pathname = useRouterState({ select: (state) => state.location.pathname })
  const collectionId = pathname.startsWith('/collections/')
    ? decodeURIComponent(pathname.slice('/collections/'.length))
    : ''
  const selectedCollection = data.collections.find((collection) => collection.id === collectionId)
  const qrs = selectedCollection ? getQrsForCollection(data, selectedCollection.id) : []
  const collectionCounts = data.collectionItems.reduce<Record<string, number>>((counts, item) => {
    counts[item.collectionId] = (counts[item.collectionId] ?? 0) + 1
    return counts
  }, {})
  const titleRef = useRef<HTMLInputElement>(null)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [armedDeleteId, setArmedDeleteId] = useState('')
  useDocumentTitle(
    selectedCollection
      ? t('collections.documentDetail', { title: selectedCollection.title })
      : t('collections.documentTitle'),
  )

  useEffect(() => {
    setTitle(selectedCollection?.title ?? '')
    setDescription(selectedCollection?.description ?? '')
  }, [selectedCollection?.id, selectedCollection?.title, selectedCollection?.description])

  useEffect(() => {
    if (!armedDeleteId) return
    function onDocClick(event: MouseEvent) {
      // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- DOM event target is EventTarget; narrowing to HTMLElement to call closest()
      const target = event.target as HTMLElement | null
      if (target?.closest(`[data-armed-for="${armedDeleteId}"]`)) return
      setArmedDeleteId('')
    }
    const attach = window.setTimeout(() => document.addEventListener('click', onDocClick), 0)
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
    if (collectionId) void navigate({ to: '/collections' })
    window.setTimeout(() => titleRef.current?.focus(), 0)
  }

  function handleDelete(target: Collection) {
    const deletedItems = data.collectionItems.filter((item) => item.collectionId === target.id)
    updateVault((current) => deleteCollection(current, target.id))
    setArmedDeleteId('')
    if (collectionId === target.id) void navigate({ to: '/collections' })

    toast.success(t('collections.deletedToast'), {
      action: {
        label: t('toast.undo'),
        onClick: () => restoreCollection(target, deletedItems),
      },
    })
  }

  function restoreCollection(target: Collection, deletedItems: typeof data.collectionItems) {
    updateVault((current) => {
      if (current.collections.some((collection) => collection.id === target.id)) return current
      const existingKeys = new Set(
        current.collectionItems.map((item) => `${item.collectionId}:${item.qrId}`),
      )
      return {
        ...current,
        collections: [...current.collections, target],
        collectionItems: [
          ...current.collectionItems,
          ...deletedItems.filter((item) => !existingKeys.has(`${item.collectionId}:${item.qrId}`)),
        ],
      }
    })
    void navigate({ to: '/collections/$collectionId', params: { collectionId: target.id } })
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

      <CollectionListCard
        collections={data.collections}
        collectionCounts={collectionCounts}
        activeId={collectionId}
        onNewCollection={startNewCollection}
      />

      <div className="grid grid-cols-1 items-start gap-4 xl:grid-cols-[minmax(320px,380px)_minmax(0,1fr)]">
        <CollectionFormCard
          collection={selectedCollection}
          title={title}
          description={description}
          armedDeleteId={armedDeleteId}
          titleRef={titleRef}
          onTitleChange={setTitle}
          onDescriptionChange={setDescription}
          onArmDelete={setArmedDeleteId}
          onDelete={handleDelete}
          onSave={saveCollection}
        />
        <CollectionQrCard collection={selectedCollection} qrs={qrs} />
      </div>
    </div>
  )
}
