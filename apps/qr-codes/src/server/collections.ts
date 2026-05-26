"use server";

import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db/client";
import { collections, qrCollections } from "@/db/schema";
import { requireAdmin } from "@/auth/admin";
import { revalidateCollection } from "@/lib/revalidate";

const inputSchema = z.object({
  title: z.string().min(1, "title is required").max(200),
  description: z.string().max(2000).optional().nullable(),
});

export async function createCollection(input: z.infer<typeof inputSchema>) {
  await requireAdmin();
  const data = inputSchema.parse(input);
  const [row] = await db
    .insert(collections)
    .values({ title: data.title, description: data.description ?? null })
    .returning({ id: collections.id });
  revalidateCollection(row.id, []);
  redirect(`/admin?c=${row.id}`);
}

export async function updateCollection(id: string, input: z.infer<typeof inputSchema>) {
  await requireAdmin();
  const data = inputSchema.parse(input);

  // QR detail pages render the collection title as a pill — fetch members so
  // we can cascade revalidation to them when the title changes.
  const members = await db
    .select({ qrId: qrCollections.qrId })
    .from(qrCollections)
    .where(eq(qrCollections.collectionId, id));

  await db
    .update(collections)
    .set({
      title: data.title,
      description: data.description ?? null,
      updatedAt: new Date(),
    })
    .where(eq(collections.id, id));

  revalidateCollection(
    id,
    members.map((m) => m.qrId),
  );
  redirect(`/admin?c=${id}`);
}

export async function deleteCollection(id: string) {
  await requireAdmin();

  const members = await db
    .select({ qrId: qrCollections.qrId })
    .from(qrCollections)
    .where(eq(qrCollections.collectionId, id));

  await db.delete(collections).where(eq(collections.id, id));

  revalidateCollection(
    id,
    members.map((m) => m.qrId),
  );
  redirect("/admin");
}
