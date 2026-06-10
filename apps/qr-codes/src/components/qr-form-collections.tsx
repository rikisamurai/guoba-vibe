import type { CollectionOption } from '@/components/qr-form'
import { FieldLabel } from '@/components/qr-form-field-label'
import { Button } from '@/components/shadcn-ui/button'
import { Input } from '@/components/shadcn-ui/input'
import { Textarea } from '@/components/shadcn-ui/textarea'

type QrFormCollectionsProps = {
  collections: CollectionOption[]
  selected: Set<string>
  adding: boolean
  newTitle: string
  newDesc: string
  creating: boolean
  onToggle: (id: string) => void
  onStartAdding: () => void
  onNewTitleChange: (next: string) => void
  onNewDescChange: (next: string) => void
  onSubmitNewCollection: () => void
  onResetNewCollection: () => void
}

export function QrFormCollections({
  collections,
  selected,
  adding,
  newTitle,
  newDesc,
  creating,
  onToggle,
  onStartAdding,
  onNewTitleChange,
  onNewDescChange,
  onSubmitNewCollection,
  onResetNewCollection,
}: QrFormCollectionsProps) {
  return (
    <div className="grid gap-2">
      <FieldLabel>Collections</FieldLabel>
      {collections.length === 0 && !adding ? (
        <p className="text-muted-foreground text-sm">No collections yet — create one below.</p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {collections.map((collection) => (
            <CollectionChip
              key={collection.id}
              collection={collection}
              active={selected.has(collection.id)}
              onToggle={onToggle}
            />
          ))}
        </div>
      )}
      {adding ? (
        <NewCollectionForm
          title={newTitle}
          description={newDesc}
          creating={creating}
          onTitleChange={onNewTitleChange}
          onDescriptionChange={onNewDescChange}
          onSubmit={onSubmitNewCollection}
          onCancel={onResetNewCollection}
        />
      ) : (
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="mt-1 w-fit"
          onClick={onStartAdding}
        >
          + New collection
        </Button>
      )}
    </div>
  )
}

function CollectionChip({
  collection,
  active,
  onToggle,
}: {
  collection: CollectionOption
  active: boolean
  onToggle: (id: string) => void
}) {
  return (
    <button
      type="button"
      onClick={() => onToggle(collection.id)}
      className={`rounded-full border px-3 py-1 text-sm ${
        active
          ? 'bg-primary text-primary-foreground border-primary'
          : 'bg-background hover:bg-muted'
      }`}
    >
      {collection.title}
    </button>
  )
}

function NewCollectionForm({
  title,
  description,
  creating,
  onTitleChange,
  onDescriptionChange,
  onSubmit,
  onCancel,
}: {
  title: string
  description: string
  creating: boolean
  onTitleChange: (next: string) => void
  onDescriptionChange: (next: string) => void
  onSubmit: () => void
  onCancel: () => void
}) {
  return (
    <div className="bg-muted/30 mt-1 space-y-3 rounded-md border p-3">
      <div className="grid gap-1.5">
        <FieldLabel htmlFor="new-collection-title">New collection title</FieldLabel>
        <Input
          id="new-collection-title"
          value={title}
          onChange={(event) => onTitleChange(event.target.value)}
          placeholder="e.g. Travel"
          autoFocus
        />
      </div>
      <div className="grid gap-1.5">
        <FieldLabel htmlFor="new-collection-description">Description (optional)</FieldLabel>
        <Textarea
          id="new-collection-description"
          value={description}
          onChange={(event) => onDescriptionChange(event.target.value)}
          rows={2}
        />
      </div>
      <div className="flex gap-2">
        <Button type="button" size="sm" onClick={onSubmit} disabled={creating}>
          {creating ? 'Creating…' : 'Create'}
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={onCancel} disabled={creating}>
          Cancel
        </Button>
      </div>
    </div>
  )
}
