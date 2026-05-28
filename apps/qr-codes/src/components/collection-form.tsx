"use client";

import { useTransition } from "react";
// Internal import; isRedirectError is not publicly exported in Next 16.2.6.
// If this breaks on a future minor, fall back to `err instanceof Error && err.message === "NEXT_REDIRECT"`.
import { isRedirectError } from "next/dist/client/components/redirect-error";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export type CollectionInput = { title: string; description: string | null };

export function CollectionForm({
  initial,
  onSubmit,
  submitLabel,
}: {
  initial?: CollectionInput;
  onSubmit: (input: CollectionInput) => Promise<void>;
  submitLabel: string;
}) {
  const [pending, start] = useTransition();
  return (
    <form
      className="max-w-xl space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        const title = String(fd.get("title") ?? "").trim();
        const description = String(fd.get("description") ?? "").trim() || null;
        if (!title) {
          toast.error("Title is required");
          return;
        }
        start(async () => {
          try {
            await onSubmit({ title, description });
          } catch (err) {
            if (isRedirectError(err)) throw err;
            toast.error(err instanceof Error ? err.message : "Failed");
          }
        });
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
          defaultValue={initial?.description ?? ""}
          rows={3}
        />
      </div>
      <Button type="submit" disabled={pending}>
        {pending ? "Saving…" : submitLabel}
      </Button>
    </form>
  );
}
