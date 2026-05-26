import type { Metadata } from "next";
import Link from "next/link";
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { db } from "@/db/client";
import { qrs, qrCollections, collections } from "@/db/schema";
import { renderSvg } from "@/lib/qr";
import { UrlPreview } from "@/components/url-preview";
import { CopyButton } from "@/components/copy-button";
import { DownloadButtons } from "@/components/download-buttons";
import { Button } from "@/components/ui/button";

function isSafeOpenScheme(url: string): boolean {
  // Allow http(s) and any custom app scheme (xhsdiscover://, etc.) but block
  // schemes that execute code in the current origin.
  const SCHEME_BLOCKLIST = new Set(["javascript", "data", "vbscript", "file"]);
  const colon = url.indexOf(":");
  if (colon === -1) return false;
  const scheme = url.slice(0, colon).toLowerCase();
  return !SCHEME_BLOCKLIST.has(scheme);
}

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const rows = await db.select().from(qrs).where(eq(qrs.id, id)).limit(1);
  const row = rows[0];
  return {
    title: row ? `${row.title} — QR Codes` : "QR Codes",
    description: row?.description ?? row?.url ?? undefined,
    robots: { index: false, follow: false },
  };
}

export default async function QrDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const rows = await db.select().from(qrs).where(eq(qrs.id, id)).limit(1);
  if (rows.length === 0) notFound();
  const row = rows[0];

  const cols = await db
    .select({ id: collections.id, title: collections.title })
    .from(qrCollections)
    .innerJoin(collections, eq(qrCollections.collectionId, collections.id))
    .where(eq(qrCollections.qrId, id));

  const svg = await renderSvg(row.url, { width: 480, margin: 2 });

  return (
    <main className="mx-auto max-w-2xl px-4 py-10 space-y-8">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold">{row.title}</h1>
        {row.description && <p className="text-muted-foreground">{row.description}</p>}
        {cols.length > 0 && (
          <div className="flex flex-wrap gap-2 text-sm">
            {cols.map((c) => (
              <Link
                key={c.id}
                href={`/c/${c.id}`}
                className="rounded-full bg-muted px-3 py-1 hover:bg-muted-foreground/20"
              >
                {c.title}
              </Link>
            ))}
          </div>
        )}
      </header>

      <div
        className="bg-white p-6 rounded-xl border mx-auto w-fit"
        dangerouslySetInnerHTML={{ __html: svg }}
      />

      <section className="space-y-3">
        <h2 className="text-sm font-medium text-muted-foreground">URL</h2>
        <code className="block break-all rounded-md bg-muted p-3 text-sm">{row.url}</code>
        <div className="flex gap-2 flex-wrap">
          <CopyButton value={row.url} label="Copy URL" />
          {isSafeOpenScheme(row.url) && (
            <Button asChild size="sm">
              <a href={row.url} target="_blank" rel="noopener noreferrer">
                Open link
              </a>
            </Button>
          )}
          <DownloadButtons id={row.id} title={row.title} />
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-medium text-muted-foreground">Parsed</h2>
        <div className="rounded-md border p-4">
          <UrlPreview url={row.url} />
        </div>
      </section>
    </main>
  );
}
