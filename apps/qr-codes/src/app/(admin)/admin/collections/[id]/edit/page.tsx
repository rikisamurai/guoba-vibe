import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { db } from "@/db/client";
import { collections } from "@/db/schema";
import { CollectionForm } from "@/components/collection-form";
import { updateCollection, deleteCollection } from "@/server/collections";
import { Button } from "@/components/ui/button";

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
      <form action={remove}>
        <Button type="submit" variant="destructive">
          Delete collection
        </Button>
      </form>
    </div>
  );
}
