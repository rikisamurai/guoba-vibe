import { Check } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import type { Collection } from '@/lib/storage'
import { cn } from '@/lib/utils'

type CollectionPickerProps = {
  collections: Collection[]
  selectedIds: string[]
  onChange: (ids: string[]) => void
}

export function CollectionPicker({ collections, selectedIds, onChange }: CollectionPickerProps) {
  const { t } = useTranslation()

  function toggleCollection(collectionId: string) {
    if (selectedIds.includes(collectionId)) {
      onChange(selectedIds.filter((id) => id !== collectionId))
      return
    }
    onChange([...selectedIds, collectionId])
  }

  if (!collections.length) {
    return (
      <p className="text-muted-foreground rounded-md border border-dashed p-3 text-center text-xs italic">
        {t('collectionPicker.noCollections')}
      </p>
    )
  }

  return (
    <div className="flex flex-wrap gap-2 overflow-visible">
      {collections.map((collection) => {
        const isChecked = selectedIds.includes(collection.id)
        return (
          <label
            key={collection.id}
            className={cn(
              'group inline-flex max-w-full cursor-pointer items-center gap-2 rounded-md border px-3 py-2 transition-colors',
              isChecked
                ? 'border-foreground bg-card text-foreground shadow-[0_0_0_1px_var(--foreground)]'
                : 'bg-card text-foreground hover:bg-muted/50',
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
                  ? 'bg-primary border-primary text-primary-foreground'
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
  )
}
