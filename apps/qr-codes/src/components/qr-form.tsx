'use client'

import { useState, useTransition } from 'react'
// NEXT 16.2.6: isRedirectError is not publicly exported from "next/navigation".
// If this internal path breaks on a future minor, fall back to err.message === "NEXT_REDIRECT".
import { isRedirectError } from 'next/dist/client/components/redirect-error'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
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
}: {
  collections: CollectionOption[]
  initial?: { title: string; description: string | null; url: string; collectionIds: string[] }
  onSubmit: (input: QrInput) => Promise<void>
  onCreateCollection: (input: {
    title: string
    description: string | null
  }) => Promise<CollectionOption>
  submitLabel: string
}) {
  const [pending, start] = useTransition()
  const [collectionsList, setCollectionsList] = useState<CollectionOption[]>(collections)
  const [selected, setSelected] = useState<Set<string>>(new Set(initial?.collectionIds ?? []))

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

  return (
    <form
      className="max-w-2xl space-y-5"
      onSubmit={(e) => {
        e.preventDefault()
        const fd = new FormData(e.currentTarget)
        const title = String(fd.get('title') ?? '').trim()
        const description = String(fd.get('description') ?? '').trim() || null
        const url = String(fd.get('url') ?? '').trim()
        const collectionIds = Array.from(selected)

        if (!title) return toast.error('Title is required')
        if (!url) return toast.error('URL is required')
        if (!parseUrl(url).isValid) return toast.error('Not a valid URL')
        if (collectionIds.length === 0) return toast.error('Select at least one collection')

        start(async () => {
          try {
            await onSubmit({ title, description, url, collectionIds })
          } catch (err) {
            if (isRedirectError(err)) throw err
            toast.error(err instanceof Error ? err.message : 'Failed')
          }
        })
      }}
    >
      <div>
        <Label htmlFor="title">Title</Label>
        <Input id="title" name="title" defaultValue={initial?.title} required />
      </div>
      <div>
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          name="description"
          defaultValue={initial?.description ?? ''}
          rows={3}
        />
      </div>
      <UrlEditor name="url" defaultValue={initial?.url ?? ''} />
      <div>
        <Label>Collections</Label>
        {collectionsList.length === 0 && !adding ? (
          <p className="text-sm text-muted-foreground mt-2">
            No collections yet — create one below.
          </p>
        ) : (
          <div className="flex flex-wrap gap-2 mt-2">
            {collectionsList.map((c) => {
              const active = selected.has(c.id)
              return (
                <button
                  type="button"
                  key={c.id}
                  onClick={() => toggle(c.id)}
                  className={`rounded-full px-3 py-1 text-sm border ${
                    active
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-background hover:bg-muted'
                  }`}
                >
                  {c.title}
                </button>
              )
            })}
          </div>
        )}

        {adding ? (
          <div className="mt-3 space-y-2 rounded-md border bg-muted/30 p-3">
            <div>
              <Label htmlFor="new-collection-title">New collection title</Label>
              <Input
                id="new-collection-title"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="e.g. Travel"
                autoFocus
              />
            </div>
            <div>
              <Label htmlFor="new-collection-description">Description (optional)</Label>
              <Textarea
                id="new-collection-description"
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
                rows={2}
              />
            </div>
            <div className="flex gap-2">
              <Button type="button" size="sm" onClick={submitNewCollection} disabled={creating}>
                {creating ? 'Creating…' : 'Create'}
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={resetNewCollection}
                disabled={creating}
              >
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="mt-3"
            onClick={() => setAdding(true)}
          >
            + New collection
          </Button>
        )}
      </div>
      <Button type="submit" disabled={pending}>
        {pending ? 'Saving…' : submitLabel}
      </Button>
    </form>
  )
}
