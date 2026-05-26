import { CollectionForm } from "@/components/collection-form";
import { createCollection } from "@/server/collections";

export default function NewCollectionPage() {
  async function handle(input: { title: string; description: string | null }) {
    "use server";
    await createCollection(input);
  }
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">New Collection</h1>
      <CollectionForm onSubmit={handle} submitLabel="Create" />
    </div>
  );
}
