import { Link } from '@tanstack/react-router'
import { ArrowRight, Check, CopyPlus, Save } from 'lucide-react'
import type { RefObject } from 'react'
import { useTranslation } from 'react-i18next'

import { MobileUrlPreview } from '@/app/qr-detail/mobile-url-preview'
import { CollectionPicker } from '@/components/collection-picker'
import { FieldLabel } from '@/components/field-label'
import { Button } from '@/components/shadcn-ui/button'
import { Card, CardAction, CardContent, CardHeader, CardTitle } from '@/components/shadcn-ui/card'
import { Input } from '@/components/shadcn-ui/input'
import { UrlEditor } from '@/components/url-editor'
import type { VaultData } from '@/lib/storage'

type QrDetailFormCardProps = {
  isNew: boolean
  canSaveAsNew: boolean
  title: string
  description: string
  url: string
  collectionIds: string[]
  collections: VaultData['collections']
  error: string
  saved: boolean
  autoFocusTitle: boolean
  titleRef: RefObject<HTMLInputElement | null>
  onTitleChange: (next: string) => void
  onDescriptionChange: (next: string) => void
  onUrlChange: (next: string) => void
  onCollectionIdsChange: (next: string[]) => void
  onSave: () => void
  onSaveAsNew: () => void
}

export function QrDetailFormCard({
  isNew,
  canSaveAsNew,
  title,
  description,
  url,
  collectionIds,
  collections,
  error,
  saved,
  autoFocusTitle,
  titleRef,
  onTitleChange,
  onDescriptionChange,
  onUrlChange,
  onCollectionIdsChange,
  onSave,
  onSaveAsNew,
}: QrDetailFormCardProps) {
  const { t } = useTranslation()

  return (
    <Card>
      <CardHeader className="border-b">
        <div className="min-w-0">
          <p className="text-muted-foreground mb-1 text-xs font-medium tracking-wider uppercase">
            {isNew ? t('qrDetail.newQr') : t('qrDetail.savedQr')}
          </p>
          <CardTitle className="truncate text-2xl font-semibold tracking-tight">
            {title || t('common.untitledQr')}
          </CardTitle>
        </div>
        <CardAction className="flex items-center gap-2">
          <Button onClick={onSave} type="button" data-tour="qr-save">
            {saved ? <Check /> : <Save />}
            {saved ? t('common.saved') : t('common.save')}
          </Button>
          {canSaveAsNew && (
            <Button onClick={onSaveAsNew} type="button" variant="outline">
              <CopyPlus />
              {t('qrDetail.saveAsNew')}
            </Button>
          )}
        </CardAction>
      </CardHeader>

      <CardContent className="space-y-5 pt-4">
        {error && (
          <div className="border-destructive/30 bg-destructive/10 text-destructive rounded-md border px-3 py-2.5 text-sm">
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
          <UrlEditor value={url} onChange={onUrlChange}>
            <MobileUrlPreview title={title} url={url} />
          </UrlEditor>
        </section>
        <section className="space-y-3">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-muted-foreground text-[10px] font-medium tracking-wider uppercase">
                {t('common.collections')}
              </p>
              <p className="text-muted-foreground mt-1 text-xs">
                {t('qrDetail.assignCollections')}
              </p>
            </div>
            <Link
              to="/collections"
              className="text-muted-foreground hover:text-foreground flex items-center gap-1 text-xs font-medium"
            >
              {t('common.manage')} <ArrowRight className="size-3" />
            </Link>
          </div>
          <CollectionPicker
            collections={collections}
            selectedIds={collectionIds}
            onChange={onCollectionIdsChange}
          />
        </section>
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
