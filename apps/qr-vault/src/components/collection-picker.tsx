import { Check } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/shadcn-ui/button'
import { Input } from '@/components/shadcn-ui/input'
import type { Collection } from '@/lib/storage'
import { cn } from '@/lib/utils'

type CollectionPickerProps = {
  collections: Collection[]
  isCreating?: boolean
  selectedIds: string[]
  onCancelCreate?: () => void
  onChange: (ids: string[]) => void
  onCreateCollection?: (title: string) => void
}

export function CollectionPicker({
  collections,
  isCreating = false,
  selectedIds,
  onCancelCreate,
  onChange,
  onCreateCollection,
}: CollectionPickerProps) {
  const { t } = useTranslation()
  const [draftTitle, setDraftTitle] = useState('')
  const [error, setError] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isCreating) inputRef.current?.focus()
  }, [isCreating])

  function toggleCollection(collectionId: string) {
    if (selectedIds.includes(collectionId)) {
      onChange(selectedIds.filter((id) => id !== collectionId))
      return
    }
    onChange([...selectedIds, collectionId])
  }

  function resetCreate() {
    setDraftTitle('')
    setError('')
    onCancelCreate?.()
  }

  function submitCreate() {
    if (!onCreateCollection) return
    const title = draftTitle.trim()
    if (!title) {
      setError(t('collectionPicker.nameRequired'))
      return
    }
    onCreateCollection(title)
    resetCreate()
  }

  return (
    <div className="space-y-2">
      {isCreating && (
        <div className="bg-background/70 rounded-lg border p-2.5 shadow-sm">
          <div className="flex flex-col gap-2 sm:flex-row">
            <Input
              ref={inputRef}
              value={draftTitle}
              aria-invalid={Boolean(error)}
              aria-label={t('collectionPicker.collectionName')}
              placeholder={t('collectionPicker.collectionName')}
              onChange={(event) => {
                setDraftTitle(event.target.value)
                if (error) setError('')
              }}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault()
                  submitCreate()
                }
                if (event.key === 'Escape') {
                  event.preventDefault()
                  resetCreate()
                }
              }}
            />
            <div className="flex gap-2">
              <Button type="button" size="sm" onClick={submitCreate}>
                {t('collectionPicker.createCollection')}
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={resetCreate}>
                {t('collectionPicker.cancelCreate')}
              </Button>
            </div>
          </div>
          {error && <p className="text-destructive mt-1.5 text-xs">{error}</p>}
        </div>
      )}

      {!collections.length ? (
        <p className="text-muted-foreground rounded-lg border border-dashed p-3 text-center text-xs italic">
          {t('collectionPicker.noCollections')}
        </p>
      ) : (
        <div className="flex flex-wrap gap-2 overflow-visible">
          {collections.map((collection) => {
            const isChecked = selectedIds.includes(collection.id)
            return (
              <label
                key={collection.id}
                className={cn(
                  'group inline-flex max-w-full cursor-pointer items-center gap-2 rounded-md border px-3 py-2 transition-colors',
                  isChecked
                    ? 'bg-background/80 text-foreground border-[var(--signal)] shadow-[0_0_0_1px_var(--signal)]'
                    : 'bg-background/65 text-foreground hover:border-ring/60 hover:bg-muted/50',
                )}
              >
                <input
                  type="checkbox"
                  checked={isChecked}
                  onChange={() => toggleCollection(collection.id)}
                  aria-label={collection.title}
                  className="sr-only"
                />
                <div
                  className={cn(
                    'flex size-4 shrink-0 items-center justify-center rounded-sm border transition-colors',
                    isChecked
                      ? 'border-[var(--signal)] bg-[var(--signal)] text-[var(--signal-foreground)]'
                      : 'border-input bg-background',
                  )}
                >
                  {isChecked && <Check className="size-3" />}
                </div>
                <span className="min-w-0 truncate text-sm font-medium">{collection.title}</span>
              </label>
            )
          })}
        </div>
      )}
    </div>
  )
}
