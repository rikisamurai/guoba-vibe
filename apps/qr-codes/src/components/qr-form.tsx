'use client'

// NEXT 16.2.6: isRedirectError is not publicly exported from "next/navigation".
// If this internal path breaks on a future minor, fall back to err.message === "NEXT_REDIRECT".
import { isRedirectError } from 'next/dist/client/components/redirect-error'
import { useState, useTransition } from 'react'
import { toast } from 'sonner'

import { QrFormActions } from '@/components/qr-form-actions'
import { QrFormCollections } from '@/components/qr-form-collections'
import { QrFormMetadataFields } from '@/components/qr-form-metadata-fields'
import { QrFormPreviewAside } from '@/components/qr-form-preview-aside'
import { UrlEditor } from '@/components/url-editor'
import { parseUrl } from '@/lib/url-parse'

export type QrInput = {
  title: string
  description: string | null
  url: string
  collectionIds: string[]
}

export type CollectionOption = { id: string; title: string }

export function QrForm({
  collections,
  initial,
  onSubmit,
  onCreateCollection,
  submitLabel,
  onSecondarySubmit,
  secondarySubmitLabel,
}: {
  collections: CollectionOption[]
  initial?: { title: string; description: string | null; url: string; collectionIds: string[] }
  onSubmit: (input: QrInput) => Promise<void>
  onCreateCollection: (input: {
    title: string
    description: string | null
  }) => Promise<CollectionOption>
  submitLabel: string
  onSecondarySubmit?: (input: QrInput) => Promise<void>
  secondarySubmitLabel?: string
}) {
  const [pending, start] = useTransition()
  const [secondaryPending, startSecondary] = useTransition()
  const [collectionsList, setCollectionsList] = useState<CollectionOption[]>(collections)
  const [selected, setSelected] = useState<Set<string>>(new Set(initial?.collectionIds ?? []))
  const [title, setTitle] = useState(initial?.title ?? '')
  const [description, setDescription] = useState(initial?.description ?? '')
  const [url, setUrl] = useState(initial?.url ?? '')

  const [adding, setAdding] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newDesc, setNewDesc] = useState('')
  const [creating, startCreating] = useTransition()

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function resetNewCollection() {
    setNewTitle('')
    setNewDesc('')
    setAdding(false)
  }

  function submitNewCollection() {
    const title = newTitle.trim()
    if (!title) {
      toast.error('Collection title is required')
      return
    }
    const description = newDesc.trim() || null
    startCreating(async () => {
      try {
        const created = await onCreateCollection({ title, description })
        setCollectionsList((prev) => [...prev, created])
        setSelected((prev) => new Set(prev).add(created.id))
        resetNewCollection()
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Failed to create collection')
      }
    })
  }

  function getInput(): QrInput | null {
    const nextTitle = title.trim()
    const nextDescription = description.trim() || null
    const nextUrl = url.trim()
    const collectionIds = Array.from(selected)

    if (!nextTitle) {
      toast.error('Title is required')
      return null
    }
    if (!nextUrl) {
      toast.error('URL is required')
      return null
    }
    if (!parseUrl(nextUrl).isValid) {
      toast.error('Not a valid URL')
      return null
    }
    if (collectionIds.length === 0) {
      toast.error('Select at least one collection')
      return null
    }

    return { title: nextTitle, description: nextDescription, url: nextUrl, collectionIds }
  }

  function runAction(
    action: (input: QrInput) => Promise<void>,
    startAction: typeof start,
    fallback: string,
  ) {
    const input = getInput()
    if (!input) return

    startAction(async () => {
      try {
        await action(input)
      } catch (err) {
        if (isRedirectError(err)) throw err
        toast.error(err instanceof Error ? err.message : fallback)
      }
    })
  }

  return (
    <form
      className="grid w-full items-start gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(380px,420px)] xl:grid-cols-[minmax(0,1fr)_minmax(440px,480px)] xl:gap-7"
      onSubmit={(e) => {
        e.preventDefault()
        runAction(onSubmit, start, 'Failed')
      }}
    >
      <div className="bg-card rounded-lg border">
        <div className="flex items-center justify-end border-b px-4 py-3 sm:px-5">
          <QrFormActions
            pending={pending}
            secondaryPending={secondaryPending}
            submitLabel={submitLabel}
            secondarySubmitLabel={secondarySubmitLabel}
            onSecondarySubmit={
              onSecondarySubmit
                ? () => runAction(onSecondarySubmit, startSecondary, 'Save as new failed')
                : undefined
            }
          />
        </div>

        <div className="space-y-6 p-4 sm:p-5">
          <QrFormMetadataFields
            title={title}
            description={description}
            onTitleChange={setTitle}
            onDescriptionChange={setDescription}
          />

          <UrlEditor name="url" value={url} onValueChange={setUrl} />

          <QrFormCollections
            collections={collectionsList}
            selected={selected}
            adding={adding}
            newTitle={newTitle}
            newDesc={newDesc}
            creating={creating}
            onToggle={toggle}
            onStartAdding={() => setAdding(true)}
            onNewTitleChange={setNewTitle}
            onNewDescChange={setNewDesc}
            onSubmitNewCollection={submitNewCollection}
            onResetNewCollection={resetNewCollection}
          />
        </div>
      </div>
      <QrFormPreviewAside title={title} url={url} />
    </form>
  )
}
