'use client'

// Internal import; isRedirectError is not publicly exported in Next 16.2.6.
// If this breaks on a future minor, fall back to `err instanceof Error && err.message === "NEXT_REDIRECT"`.
import { isRedirectError } from 'next/dist/client/components/redirect-error'
import { useTransition } from 'react'
import { toast } from 'sonner'

import { Button } from '@/components/shadcn-ui/button'
import { Input } from '@/components/shadcn-ui/input'
import { Label } from '@/components/shadcn-ui/label'
import { Textarea } from '@/components/shadcn-ui/textarea'

export type CollectionInput = { title: string; description: string | null }

export function CollectionForm({
  initial,
  onSubmit,
  submitLabel,
}: {
  initial?: CollectionInput
  onSubmit: (input: CollectionInput) => Promise<void>
  submitLabel: string
}) {
  const [pending, start] = useTransition()
  return (
    <form
      className="max-w-xl space-y-4"
      onSubmit={(e) => {
        e.preventDefault()
        const fd = new FormData(e.currentTarget)
        const title = ((fd.get('title') ?? '') as string).trim()
        const description = ((fd.get('description') ?? '') as string).trim() || null
        if (!title) {
          toast.error('Title is required')
          return
        }
        start(async () => {
          try {
            await onSubmit({ title, description })
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
      <Button type="submit" disabled={pending}>
        {pending ? 'Saving…' : submitLabel}
      </Button>
    </form>
  )
}
