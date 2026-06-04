'use client'

// NEXT 16.2.6: isRedirectError is not publicly exported from "next/navigation".
// If this internal path breaks on a future minor, fall back to err.message === "NEXT_REDIRECT".
import { isRedirectError } from 'next/dist/client/components/redirect-error'
import { type ReactNode, useState, useTransition } from 'react'
import { toast } from 'sonner'

import { QrLivePreview } from '@/components/qr-live-preview'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { UrlEditor } from '@/components/url-editor'
import { UrlPreview } from '@/components/url-preview'
import { parseUrl } from '@/lib/url-parse'

export type QrInput = {
  title: string
  description: string | null
  url: string
  collectionIds: string[]
}

export type CollectionOption = { id: string; title: string }

function FieldLabel({ htmlFor, children }: { htmlFor?: string; children: ReactNode }) {
  return (
    <Label
      htmlFor={htmlFor}
      className="text-muted-foreground text-xs font-medium tracking-wide uppercase"
    >
      {children}
    </Label>
  )
}

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

  function renderActionButtons(className = '') {
    return (
      <div className={`flex flex-wrap gap-2 ${className}`}>
        <Button type="submit" disabled={pending || secondaryPending}>
          {pending ? 'Saving…' : submitLabel}
        </Button>
        {onSecondarySubmit && secondarySubmitLabel && (
          <Button
            type="button"
            variant="outline"
            disabled={pending || secondaryPending}
            onClick={() => runAction(onSecondarySubmit, startSecondary, 'Save as new failed')}
          >
            {secondaryPending ? 'Saving…' : secondarySubmitLabel}
          </Button>
        )}
      </div>
    )
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
          {renderActionButtons()}
        </div>

        <div className="space-y-6 p-4 sm:p-5">
          <div className="grid gap-1.5">
            <FieldLabel htmlFor="title">Title</FieldLabel>
            <Input
              id="title"
              name="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>

          <div className="grid gap-1.5">
            <FieldLabel htmlFor="description">Description</FieldLabel>
            <Textarea
              id="description"
              name="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
            />
          </div>

          <UrlEditor name="url" value={url} onValueChange={setUrl} />

          <div className="grid gap-2">
            <FieldLabel>Collections</FieldLabel>
            {collectionsList.length === 0 && !adding ? (
              <p className="text-muted-foreground text-sm">
                No collections yet — create one below.
              </p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {collectionsList.map((c) => {
                  const active = selected.has(c.id)
                  return (
                    <button
                      type="button"
                      key={c.id}
                      onClick={() => toggle(c.id)}
                      className={`rounded-full border px-3 py-1 text-sm ${
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
              <div className="bg-muted/30 mt-1 space-y-3 rounded-md border p-3">
                <div className="grid gap-1.5">
                  <FieldLabel htmlFor="new-collection-title">New collection title</FieldLabel>
                  <Input
                    id="new-collection-title"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    placeholder="e.g. Travel"
                    autoFocus
                  />
                </div>
                <div className="grid gap-1.5">
                  <FieldLabel htmlFor="new-collection-description">
                    Description (optional)
                  </FieldLabel>
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
                className="mt-1 w-fit"
                onClick={() => setAdding(true)}
              >
                + New collection
              </Button>
            )}
          </div>
        </div>
      </div>
      <aside className="space-y-4 lg:sticky lg:top-6">
        <QrLivePreview title={title} url={url} />
        <section className="rounded-lg border p-4">
          <h2 className="mb-3 text-sm font-medium">Parsed</h2>
          <UrlPreview url={url} />
        </section>
      </aside>
    </form>
  )
}
