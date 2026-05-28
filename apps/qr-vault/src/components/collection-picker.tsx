import { Check } from 'lucide-react'

import type { Collection } from '@/lib/storage'
import { cn } from '@/lib/utils'

type CollectionPickerProps = {
  collections: Collection[]
  selectedIds: string[]
  onChange: (ids: string[]) => void
}

export function CollectionPicker({ collections, selectedIds, onChange }: CollectionPickerProps) {
  function toggleCollection(collectionId: string) {
    if (selectedIds.includes(collectionId)) {
      onChange(selectedIds.filter((id) => id !== collectionId))
      return
    }
    onChange([...selectedIds, collectionId])
  }

  if (!collections.length) {
    return (
      <p className="text-muted-foreground rounded-md border border-dashed px-3 py-3 text-center text-xs italic">
        no collections yet
      </p>
    )
  }

  return (
    <div className="grid gap-1.5">
      {collections.map((collection) => {
        const isChecked = selectedIds.includes(collection.id)
        return (
          <label
            key={collection.id}
            className={cn(
              'group flex cursor-pointer items-center gap-3 rounded-md border px-3 py-2 transition-colors',
              isChecked
                ? 'bg-accent text-accent-foreground'
                : 'bg-card text-foreground hover:bg-muted/50',
            )}
          >
            <input
              type="checkbox"
              checked={isChecked}
              onChange={() => toggleCollection(collection.id)}
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
            <span className="truncate text-sm font-medium">{collection.title}</span>
          </label>
        )
      })}
    </div>
  )
}
