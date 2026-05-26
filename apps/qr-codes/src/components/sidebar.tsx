"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

type Item = { id: string; title: string };

function CollectionsList({ collections }: { collections: Item[] }) {
  const params = useSearchParams();
  const active = params.get("c") ?? undefined;
  return (
    <nav className="flex flex-col gap-1">
      <Link
        href="/admin"
        className={`rounded px-2 py-1.5 text-sm hover:bg-muted ${
          !active ? "bg-muted font-medium" : ""
        }`}
      >
        All QRs
      </Link>
      {collections.map((c) => (
        <Link
          key={c.id}
          href={`/admin?c=${c.id}`}
          className={`rounded px-2 py-1.5 text-sm hover:bg-muted truncate ${
            active === c.id ? "bg-muted font-medium" : ""
          }`}
        >
          {c.title}
        </Link>
      ))}
    </nav>
  );
}

export function Sidebar({ collections }: { collections: Item[] }) {
  return (
    <aside className="w-64 border-r flex flex-col p-4 gap-2 shrink-0">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-medium text-muted-foreground">Collections</h2>
        <Button asChild size="sm" variant="ghost">
          <Link href="/admin/collections/new">+ New</Link>
        </Button>
      </div>
      <Separator />
      <Suspense fallback={<div className="text-sm text-muted-foreground">…</div>}>
        <CollectionsList collections={collections} />
      </Suspense>
      <div className="mt-auto">
        <Button asChild className="w-full">
          <Link href="/admin/qrs/new">+ New QR</Link>
        </Button>
      </div>
    </aside>
  );
}
