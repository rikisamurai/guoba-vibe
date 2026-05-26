"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db/client";
import { collections } from "@/db/schema";
import { requireAdmin } from "@/auth/admin";

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
  revalidatePath("/admin");
  redirect(`/admin?c=${row.id}`);
}

export async function updateCollection(id: string, input: z.infer<typeof inputSchema>) {
  await requireAdmin();
  const data = inputSchema.parse(input);
  await db
    .update(collections)
    .set({
      title: data.title,
      description: data.description ?? null,
      updatedAt: new Date(),
    })
    .where(eq(collections.id, id));
  revalidatePath("/admin");
  revalidatePath(`/c/${id}`);
  redirect(`/admin?c=${id}`);
}

export async function deleteCollection(id: string) {
  await requireAdmin();
  await db.delete(collections).where(eq(collections.id, id));
  revalidatePath("/admin");
  revalidatePath(`/c/${id}`);
  redirect("/admin");
}
