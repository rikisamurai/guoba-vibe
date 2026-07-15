import { Save, Trash2 } from 'lucide-react'
import type { RefObject } from 'react'
import { useTranslation } from 'react-i18next'

import type { CollectionSummary } from '@/app/vault/vault-types'
import { FieldLabel } from '@/components/field-label'
import { Button } from '@/components/shadcn-ui/button'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/shadcn-ui/card'
import { Input } from '@/components/shadcn-ui/input'
import { Textarea } from '@/components/shadcn-ui/textarea'
import { cn } from '@/lib/utils'

type CollectionFormCardProps = {
  collection?: CollectionSummary
  title: string
  description: string
  armedDeleteId: string
  armedProgress: number
  titleRef: RefObject<HTMLInputElement | null>
  onTitleChange: (next: string) => void
  onDescriptionChange: (next: string) => void
  onArmDelete: (id: string) => void
  onDelete: (collection: CollectionSummary) => void
  onSave: () => void
}

export function CollectionFormCard({
  collection,
  title,
  description,
  armedDeleteId,
  armedProgress,
  titleRef,
  onTitleChange,
  onDescriptionChange,
  onArmDelete,
  onDelete,
  onSave,
}: CollectionFormCardProps) {
  const { t } = useTranslation()

  return (
    <Card>
      <CardHeader className="border-b">
        <div className="min-w-0">
          <p className="text-muted-foreground mb-1 text-[10px] font-medium tracking-wider uppercase">
            {collection ? t('collections.edit') : t('collections.create')}
          </p>
          <CardTitle className="truncate">
            {collection ? collection.title : t('collections.newCollection')}
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
            onChange={(event) => onTitleChange(event.target.value)}
            placeholder={t('collections.titlePlaceholder')}
          />
        </div>
        <div className="grid gap-1.5">
          <FieldLabel htmlFor="coll-desc">{t('common.description')}</FieldLabel>
          <Textarea
            id="coll-desc"
            value={description}
            onChange={(event) => onDescriptionChange(event.target.value)}
            rows={4}
            placeholder={t('collections.descriptionPlaceholder')}
          />
        </div>
      </CardContent>
      <CardFooter
        className={cn(
          'flex-wrap gap-3 bg-transparent',
          collection ? 'justify-between' : 'justify-end',
        )}
      >
        {collection && (
          <CollectionDeleteButton
            collection={collection}
            armedDeleteId={armedDeleteId}
            armedProgress={armedProgress}
            onArmDelete={onArmDelete}
            onDelete={onDelete}
          />
        )}
        <Button type="button" onClick={onSave} disabled={!title.trim()}>
          <Save /> {t('collections.saveCollection')}
        </Button>
      </CardFooter>
    </Card>
  )
}

function CollectionDeleteButton({
  collection,
  armedDeleteId,
  armedProgress,
  onArmDelete,
  onDelete,
}: Pick<CollectionFormCardProps, 'armedDeleteId' | 'armedProgress' | 'onArmDelete' | 'onDelete'> & {
  collection: CollectionSummary
}) {
  const { t } = useTranslation()

  return (
    <div className="flex items-center">
      {armedDeleteId === collection.id ? (
        <Button
          type="button"
          variant="destructive"
          className="relative overflow-hidden"
          data-armed-for={collection.id}
          onClick={() => onDelete(collection)}
          aria-label={t('collections.confirmDelete', { name: collection.title })}
        >
          <Trash2 /> {t('common.confirm')}
          <span
            className="absolute bottom-0 left-0 h-0.5 bg-[var(--warning)]"
            style={{ width: `${armedProgress * 100}%` }}
          />
        </Button>
      ) : (
        <Button
          type="button"
          variant="outline"
          data-armed-for={collection.id}
          onClick={() => onArmDelete(collection.id)}
          aria-label={t('collections.deleteCollection', { name: collection.title })}
        >
          <Trash2 /> {t('common.delete')}
        </Button>
      )}
    </div>
  )
}
