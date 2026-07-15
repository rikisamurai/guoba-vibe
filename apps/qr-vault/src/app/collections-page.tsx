import { Link, useNavigate, useRouterState } from '@tanstack/react-router'
import { ArrowRight } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { CollectionCoverageRow } from '@/app/collections/collection-coverage-row'
import { CollectionFormCard } from '@/app/collections/collection-form-card'
import { CollectionListCard } from '@/app/collections/collection-list-card'
import { CollectionQrCard } from '@/app/collections/collection-qr-card'
import { useVault } from '@/app/vault/use-vault'
import type { CollectionSummary } from '@/app/vault/vault-types'
import { useArmedAction } from '@/hooks/use-armed-action'
import { useDocumentTitle } from '@/lib/use-document-title'

export function CollectionsPage() {
  const { t } = useTranslation()
  const { view, collection } = useVault()
  const navigate = useNavigate()
  const pathname = useRouterState({ select: (state) => state.location.pathname })
  const collectionId = pathname.startsWith('/collections/')
    ? decodeURIComponent(pathname.slice('/collections/'.length))
    : ''
  const selectedCollection = view.collections.find((item) => item.id === collectionId)
  const qrs = selectedCollection
    ? view.listQrs({ scope: selectedCollection.id, order: 'stored' })
    : []
  const titleRef = useRef<HTMLInputElement>(null)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const {
    armedId: armedDeleteId,
    progress: armedProgress,
    arm: armDelete,
    cancel: cancelArm,
  } = useArmedAction()
  useDocumentTitle(
    selectedCollection
      ? t('collections.documentDetail', { title: selectedCollection.title })
      : t('collections.documentTitle'),
  )

  useEffect(() => {
    setTitle(selectedCollection?.title ?? '')
    setDescription(selectedCollection?.description ?? '')
  }, [selectedCollection?.id, selectedCollection?.title, selectedCollection?.description])

  function saveCollection() {
    if (!title.trim()) return
    collection.save({ id: selectedCollection?.id, title, description })
    if (!selectedCollection) {
      setTitle('')
      setDescription('')
    }
  }

  function startNewCollection() {
    cancelArm()
    setTitle('')
    setDescription('')
    if (collectionId) void navigate({ to: '/collections' })
    window.setTimeout(() => titleRef.current?.focus(), 0)
  }

  function handleDelete(target: CollectionSummary) {
    const receipt = collection.delete(target.id)
    cancelArm()
    if (collectionId === target.id) void navigate({ to: '/collections' })
    if (receipt.kind !== 'deleted') return

    toast.success(t('collections.deletedToast'), {
      action: {
        label: t('toast.undo'),
        onClick: () => {
          receipt.undo()
          void navigate({ to: '/collections/$collectionId', params: { collectionId: target.id } })
        },
      },
    })
  }

  return (
    <div className="space-y-4">
      <div className="bg-card/70 signal-panel flex items-end justify-between gap-4 rounded-lg border p-4 backdrop-blur-sm">
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

      <CollectionCoverageRow
        collectionCount={view.counts.collections}
        assignmentCount={view.counts.assignments}
        uncategorizedCount={view.counts.uncategorized}
      />

      <CollectionListCard
        collections={view.collections}
        activeId={collectionId}
        onNewCollection={startNewCollection}
      />

      <div className="grid grid-cols-1 items-start gap-4 xl:grid-cols-[minmax(320px,380px)_minmax(0,1fr)]">
        <CollectionFormCard
          collection={selectedCollection}
          title={title}
          description={description}
          armedDeleteId={armedDeleteId}
          armedProgress={armedProgress}
          titleRef={titleRef}
          onTitleChange={setTitle}
          onDescriptionChange={setDescription}
          onArmDelete={armDelete}
          onDelete={handleDelete}
          onSave={saveCollection}
        />
        <CollectionQrCard collection={selectedCollection} qrs={qrs} />
      </div>
    </div>
  )
}
