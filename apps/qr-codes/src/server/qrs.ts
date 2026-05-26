"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db/client";
import { qrs, qrCollections } from "@/db/schema";
import { requireAdmin } from "@/auth/admin";
import { parseUrl } from "@/lib/url-parse";

const inputSchema = z.object({
  title: z.string().min(1, "title is required").max(200),
  description: z.string().max(2000).optional().nullable(),
  url: z
    .string()
    .min(1, "url is required")
    .refine((v) => parseUrl(v).isValid, { message: "not a valid URL" }),
  collectionIds: z.array(z.string().min(1)).min(1, "select at least one collection"),
});

export async function createQr(input: z.infer<typeof inputSchema>) {
  await requireAdmin();
  const data = inputSchema.parse(input);
  const collectionIds = Array.from(new Set(data.collectionIds));

  const id = await db.transaction(async (tx) => {
    const [row] = await tx
      .insert(qrs)
      .values({
        title: data.title,
        description: data.description ?? null,
        url: data.url,
      })
      .returning({ id: qrs.id });

    await tx
      .insert(qrCollections)
      .values(collectionIds.map((cid) => ({ qrId: row.id, collectionId: cid })));

    return row.id;
  });

  revalidatePath("/admin");
  for (const cid of collectionIds) revalidatePath(`/c/${cid}`);
  redirect(`/q/${id}`);
}

export async function updateQr(id: string, input: z.infer<typeof inputSchema>) {
  await requireAdmin();
  const data = inputSchema.parse(input);
  const collectionIds = Array.from(new Set(data.collectionIds));

  // Get old collection ids so we can revalidate them too (in case the QR is moved).
  const oldLinks = await db
    .select({ collectionId: qrCollections.collectionId })
    .from(qrCollections)
    .where(eq(qrCollections.qrId, id));

  await db.transaction(async (tx) => {
    await tx
      .update(qrs)
      .set({
        title: data.title,
        description: data.description ?? null,
        url: data.url,
      })
      .where(eq(qrs.id, id));

    await tx.delete(qrCollections).where(eq(qrCollections.qrId, id));
    await tx
      .insert(qrCollections)
      .values(collectionIds.map((cid) => ({ qrId: id, collectionId: cid })));
  });

  revalidatePath("/admin");
  revalidatePath(`/q/${id}`);
  const allCollections = new Set([
    ...oldLinks.map((l) => l.collectionId),
    ...collectionIds,
  ]);
  for (const cid of allCollections) revalidatePath(`/c/${cid}`);
  redirect(`/q/${id}`);
}

export async function deleteQr(id: string) {
  await requireAdmin();
  // Read collection memberships before delete (for revalidation).
  const oldLinks = await db
    .select({ collectionId: qrCollections.collectionId })
    .from(qrCollections)
    .where(eq(qrCollections.qrId, id));

  await db.delete(qrs).where(eq(qrs.id, id));

  revalidatePath("/admin");
  revalidatePath(`/q/${id}`);
  for (const link of oldLinks) revalidatePath(`/c/${link.collectionId}`);
  redirect("/admin");
}
