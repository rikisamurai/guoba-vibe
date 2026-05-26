import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { db } from "@/db/client";
import { collections } from "@/db/schema";
import { CollectionForm } from "@/components/collection-form";
import { DeleteButton } from "@/components/delete-button";
import { updateCollection, deleteCollection } from "@/server/collections";

export default async function EditCollectionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const row = await db.select().from(collections).where(eq(collections.id, id)).limit(1);
  if (row.length === 0) notFound();
  const collection = row[0];

  async function update(input: { title: string; description: string | null }) {
    "use server";
    await updateCollection(id, input);
  }
  async function remove() {
    "use server";
    await deleteCollection(id);
  }

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Edit Collection</h1>
      <CollectionForm
        initial={{ title: collection.title, description: collection.description }}
        onSubmit={update}
        submitLabel="Save"
      />
      <DeleteButton
        action={remove}
        label="Delete collection"
        confirmMessage={`Delete collection "${collection.title}"? This will remove the collection but keep the QRs (they will become unaffiliated and may violate the ≥1 collection rule on edit).`}
      />
    </div>
  );
}
