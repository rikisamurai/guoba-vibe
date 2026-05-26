import { notFound } from "next/navigation";
import { getQrById, getQrCollections } from "@/data/qrs";
import { listCollections } from "@/data/collections";
import { QrForm } from "@/components/qr-form";
import { DeleteButton } from "@/components/delete-button";
import { updateQr, deleteQr } from "@/server/qrs";

export default async function EditQrPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const qr = await getQrById(id);
  if (!qr) notFound();

  const [links, cols] = await Promise.all([
    getQrCollections(id),
    listCollections(),
  ]);

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
          collectionIds: links.map((l) => l.id),
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
