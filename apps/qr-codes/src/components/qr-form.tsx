"use client";

import { useState, useTransition } from "react";
// NEXT 16.2.6: isRedirectError is not publicly exported from "next/navigation".
// If this internal path breaks on a future minor, fall back to err.message === "NEXT_REDIRECT".
import { isRedirectError } from "next/dist/client/components/redirect-error";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { UrlEditor } from "@/components/url-editor";
import { parseUrl } from "@/lib/url-parse";

export type QrInput = {
  title: string;
  description: string | null;
  url: string;
  collectionIds: string[];
};

export function QrForm({
  collections,
  initial,
  onSubmit,
  submitLabel,
}: {
  collections: { id: string; title: string }[];
  initial?: { title: string; description: string | null; url: string; collectionIds: string[] };
  onSubmit: (input: QrInput) => Promise<void>;
  submitLabel: string;
}) {
  const [pending, start] = useTransition();
  const [selected, setSelected] = useState<Set<string>>(
    new Set(initial?.collectionIds ?? []),
  );

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <form
      className="max-w-2xl space-y-5"
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        const title = String(fd.get("title") ?? "").trim();
        const description = String(fd.get("description") ?? "").trim() || null;
        const url = String(fd.get("url") ?? "").trim();
        const collectionIds = Array.from(selected);

        if (!title) return toast.error("Title is required");
        if (!url) return toast.error("URL is required");
        if (!parseUrl(url).isValid) return toast.error("Not a valid URL");
        if (collectionIds.length === 0)
          return toast.error("Select at least one collection");

        start(async () => {
          try {
            await onSubmit({ title, description, url, collectionIds });
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
      <UrlEditor name="url" defaultValue={initial?.url ?? ""} />
      <div>
        <Label>Collections</Label>
        {collections.length === 0 ? (
          <p className="text-sm text-muted-foreground mt-2">
            No collections yet — create one first in the sidebar.
          </p>
        ) : (
          <div className="flex flex-wrap gap-2 mt-2">
            {collections.map((c) => {
              const active = selected.has(c.id);
              return (
                <button
                  type="button"
                  key={c.id}
                  onClick={() => toggle(c.id)}
                  className={`rounded-full px-3 py-1 text-sm border ${
                    active
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-background hover:bg-muted"
                  }`}
                >
                  {c.title}
                </button>
              );
            })}
          </div>
        )}
      </div>
      <Button type="submit" disabled={pending}>
        {pending ? "Saving…" : submitLabel}
      </Button>
    </form>
  );
}
