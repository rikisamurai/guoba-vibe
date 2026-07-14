import { Check, CopyPlus, Save } from 'lucide-react'
import type { RefObject } from 'react'
import { useTranslation } from 'react-i18next'

import { CollectionsSection } from '@/app/qr-detail/collections-section'
import type { CreateCollectionResult } from '@/app/qr-detail/inline-collection-create'
import { MobileUrlPreview } from '@/app/qr-detail/mobile-url-preview'
import { QrStatusChips } from '@/app/qr-detail/qr-status-chips'
import type { CollectionSummary } from '@/app/vault/vault-types'
import { FieldLabel } from '@/components/field-label'
import { Button } from '@/components/shadcn-ui/button'
import { Card, CardAction, CardContent, CardHeader, CardTitle } from '@/components/shadcn-ui/card'
import { Input } from '@/components/shadcn-ui/input'
import { UrlEditor, type UrlEditorChange } from '@/components/url-editor'
import type { QueryRow } from '@/lib/url'

type QrDetailFormCardProps = {
  isNew: boolean
  isEmpty: boolean
  isValid: boolean
  isDirty: boolean
  canSave: boolean
  canSaveAsNew: boolean
  title: string
  description: string
  url: string
  queryRows: QueryRow[]
  collectionIds: string[]
  collections: readonly CollectionSummary[]
  error: string
  saved: boolean
  autoFocusTitle: boolean
  titleRef: RefObject<HTMLInputElement | null>
  onTitleChange: (next: string) => void
  onDescriptionChange: (next: string) => void
  onUrlEditorChange: (next: UrlEditorChange) => void
  onCollectionIdsChange: (next: string[]) => void
  onCreateCollection: (title: string) => CreateCollectionResult
  onSave: () => void
  onSaveAsNew: () => void
}

export function QrDetailFormCard({
  isNew,
  isEmpty,
  isValid,
  isDirty,
  canSave,
  canSaveAsNew,
  title,
  description,
  url,
  queryRows,
  collectionIds,
  collections,
  error,
  saved,
  autoFocusTitle,
  titleRef,
  onTitleChange,
  onDescriptionChange,
  onUrlEditorChange,
  onCollectionIdsChange,
  onCreateCollection,
  onSave,
  onSaveAsNew,
}: QrDetailFormCardProps) {
  const { t } = useTranslation()

  return (
    <Card>
      <CardHeader className="border-b">
        <div className="min-w-0">
          <div className="mb-1 flex flex-wrap items-center gap-1.5">
            <p className="text-muted-foreground text-xs font-medium tracking-wider uppercase">
              {isNew ? t('qrDetail.newQr') : t('qrDetail.savedQr')}
            </p>
            <QrStatusChips isEmpty={isEmpty} isValid={isValid} isDirty={isDirty} />
          </div>
          <CardTitle className="truncate text-2xl font-semibold tracking-tight">
            {title || t('common.untitledQr')}
          </CardTitle>
        </div>
        <CardAction className="flex items-center gap-2">
          <Button onClick={onSave} type="button" data-tour="qr-save" disabled={!canSave}>
            {saved ? <Check /> : <Save />}
            {saved ? t('common.saved') : t('common.save')}
          </Button>
          {canSaveAsNew && (
            <Button onClick={onSaveAsNew} type="button" variant="outline" disabled={!canSave}>
              <CopyPlus />
              {t('qrDetail.saveAsNew')}
            </Button>
          )}
        </CardAction>
      </CardHeader>

      <CardContent className="space-y-5 pt-4">
        {error && (
          <div className="border-destructive/30 bg-destructive/10 text-destructive rounded-lg border px-3 py-2.5 text-sm">
            {error}
          </div>
        )}
        <MetadataFields
          title={title}
          description={description}
          autoFocusTitle={autoFocusTitle}
          titleRef={titleRef}
          onTitleChange={onTitleChange}
          onDescriptionChange={onDescriptionChange}
        />
        <section className="space-y-3">
          <div>
            <p className="text-muted-foreground text-[10px] font-medium tracking-wider uppercase">
              {t('qrDetail.urlEditor')}
            </p>
            <p className="text-muted-foreground mt-1 text-xs">
              {t('qrDetail.urlEditorDescription')}
            </p>
          </div>
          <UrlEditor value={url} queryRows={queryRows} onChange={onUrlEditorChange}>
            <MobileUrlPreview title={title} url={url} />
          </UrlEditor>
        </section>
        <CollectionsSection
          collections={collections}
          collectionIds={collectionIds}
          onCollectionIdsChange={onCollectionIdsChange}
          onCreateCollection={onCreateCollection}
        />
      </CardContent>
    </Card>
  )
}

function MetadataFields({
  title,
  description,
  autoFocusTitle,
  titleRef,
  onTitleChange,
  onDescriptionChange,
}: Pick<
  QrDetailFormCardProps,
  'title' | 'description' | 'autoFocusTitle' | 'titleRef' | 'onTitleChange' | 'onDescriptionChange'
>) {
  const { t } = useTranslation()

  return (
    <section className="space-y-3">
      <p className="text-muted-foreground text-[10px] font-medium tracking-wider uppercase">
        {t('qrDetail.metadata')}
      </p>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <div className="grid gap-1.5">
          <FieldLabel htmlFor="qr-title">{t('common.title')}</FieldLabel>
          <Input
            id="qr-title"
            ref={titleRef}
            value={title}
            onChange={(event) => onTitleChange(event.target.value)}
            placeholder={
              autoFocusTitle
                ? t('qrDetail.autoFocusTitlePlaceholder')
                : t('qrDetail.titlePlaceholder')
            }
          />
        </div>
        <div className="grid gap-1.5">
          <FieldLabel htmlFor="qr-desc">{t('common.description')}</FieldLabel>
          <Input
            id="qr-desc"
            value={description}
            onChange={(event) => onDescriptionChange(event.target.value)}
            placeholder={t('qrDetail.descriptionPlaceholder')}
          />
        </div>
      </div>
    </section>
  )
}
