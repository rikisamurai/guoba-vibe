import { asc, eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { db } from "@/db/client";
import { qrs, qrCollections, collections } from "@/db/schema";
import { QrForm } from "@/components/qr-form";
import { DeleteButton } from "@/components/delete-button";
import { updateQr, deleteQr } from "@/server/qrs";

export default async function EditQrPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const row = await db.select().from(qrs).where(eq(qrs.id, id)).limit(1);
  if (row.length === 0) notFound();
  const qr = row[0];

  const links = await db
    .select({ collectionId: qrCollections.collectionId })
    .from(qrCollections)
    .where(eq(qrCollections.qrId, id));

  const cols = await db
    .select({ id: collections.id, title: collections.title })
    .from(collections)
    .orderBy(asc(collections.title));

  async function update(input: {
    title: string;
    description: string | null;
    url: string;
    collectionIds: string[];
  }) {
    "use server";
    await updateQr(id, input);
  }
  async function remove() {
    "use server";
    await deleteQr(id);
  }

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Edit QR</h1>
      <QrForm
        collections={cols}
        initial={{
          title: qr.title,
          description: qr.description,
          url: qr.url,
          collectionIds: links.map((l) => l.collectionId),
        }}
        onSubmit={update}
        submitLabel="Save"
      />
      <DeleteButton
        action={remove}
        label="Delete QR"
        confirmMessage={`Delete QR "${qr.title}"? This cannot be undone.`}
      />
    </div>
  );
}
