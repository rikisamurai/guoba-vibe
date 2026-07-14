import { Link } from '@tanstack/react-router'
import { ArrowRight, Plus } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import type { CreateCollectionResult } from '@/app/qr-detail/inline-collection-create'
import type { CollectionSummary } from '@/app/vault/vault-types'
import { CollectionPicker } from '@/components/collection-picker'
import { Button } from '@/components/shadcn-ui/button'

type CollectionsSectionProps = {
  collectionIds: string[]
  collections: readonly CollectionSummary[]
  onCollectionIdsChange: (next: string[]) => void
  onCreateCollection: (title: string) => CreateCollectionResult
}

export function CollectionsSection({
  collectionIds,
  collections,
  onCollectionIdsChange,
  onCreateCollection,
}: CollectionsSectionProps) {
  const { t } = useTranslation()
  const [isCreating, setIsCreating] = useState(false)

  return (
    <section className="space-y-3">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-muted-foreground text-[10px] font-medium tracking-wider uppercase">
            {t('common.collections')}
          </p>
          <p className="text-muted-foreground mt-1 text-xs">{t('qrDetail.assignCollections')}</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setIsCreating(true)}
            aria-expanded={isCreating}
          >
            <Plus />
            {t('collectionPicker.newCollection')}
          </Button>
          <Link
            to="/collections"
            className="text-muted-foreground hover:text-foreground flex items-center gap-1 text-xs font-medium"
          >
            {t('common.manage')} <ArrowRight className="size-3" />
          </Link>
        </div>
      </div>
      <CollectionPicker
        collections={collections}
        isCreating={isCreating}
        selectedIds={collectionIds}
        onCancelCreate={() => setIsCreating(false)}
        onChange={onCollectionIdsChange}
        onCreateCollection={onCreateCollection}
      />
    </section>
  )
}
