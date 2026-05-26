import { and, desc, eq, ilike, or, inArray } from "drizzle-orm";
import { db } from "@/db/client";
import { qrs, qrCollections, collections } from "@/db/schema";
import { SearchBar } from "@/components/search-bar";
import { QrCard } from "@/components/qr-card";

type SearchParams = Promise<{ c?: string; q?: string }>;

export default async function AdminHome({ searchParams }: { searchParams: SearchParams }) {
  const { c, q } = await searchParams;

  const filters = [];
  if (q) {
    const needle = `%${q}%`;
    filters.push(
      or(
        ilike(qrs.title, needle),
        ilike(qrs.url, needle),
        ilike(qrs.description, needle),
      )!,
    );
  }
  if (c) {
    const inCollection = db
      .select({ id: qrCollections.qrId })
      .from(qrCollections)
      .where(eq(qrCollections.collectionId, c));
    filters.push(inArray(qrs.id, inCollection));
  }

  const rows = await db
    .select({ id: qrs.id, title: qrs.title, url: qrs.url })
    .from(qrs)
    .where(filters.length ? and(...filters) : undefined)
    .orderBy(desc(qrs.createdAt));

  const collection = c
    ? (
        await db
          .select()
          .from(collections)
          .where(eq(collections.id, c))
          .limit(1)
      )[0]
    : null;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <h1 className="text-xl font-semibold">
          {collection ? collection.title : "All QRs"}
          <span className="ml-2 text-muted-foreground text-sm">({rows.length})</span>
        </h1>
        <SearchBar />
      </div>
      {rows.length === 0 ? (
        <p className="text-muted-foreground">No QRs match.</p>
      ) : (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-4">
          {rows.map((r) => (
            <QrCard key={r.id} id={r.id} title={r.title} url={r.url} />
          ))}
        </div>
      )}
    </div>
  );
}
