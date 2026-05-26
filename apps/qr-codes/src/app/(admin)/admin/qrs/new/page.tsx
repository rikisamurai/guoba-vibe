import { asc } from "drizzle-orm";
import { db } from "@/db/client";
import { collections } from "@/db/schema";
import { QrForm } from "@/components/qr-form";
import { createQr } from "@/server/qrs";

export default async function NewQrPage({
  searchParams,
}: {
  searchParams: Promise<{ c?: string }>;
}) {
  const { c } = await searchParams;
  const cols = await db
    .select({ id: collections.id, title: collections.title })
    .from(collections)
    .orderBy(asc(collections.title));

  async function handle(input: {
    title: string;
    description: string | null;
    url: string;
    collectionIds: string[];
  }) {
    "use server";
    await createQr(input);
  }

  const validCollectionIds = c && cols.some((col) => col.id === c) ? [c] : [];
  const initial = validCollectionIds.length
    ? { title: "", description: null, url: "", collectionIds: validCollectionIds }
    : undefined;

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">New QR</h1>
      <QrForm collections={cols} initial={initial} onSubmit={handle} submitLabel="Create" />
    </div>
  );
}
