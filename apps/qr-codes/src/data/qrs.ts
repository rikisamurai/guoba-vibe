import "server-only";
import { cache } from "react";
import { and, desc, eq, ilike, inArray, or } from "drizzle-orm";
import { db } from "@/db/client";
import { qrs, qrCollections, collections } from "@/db/schema";

export type QrCard = { id: string; title: string; url: string };

export const getQrById = cache(async (id: string) => {
  const [row] = await db.select().from(qrs).where(eq(qrs.id, id)).limit(1);
  return row ?? null;
});

export const getQrCollections = cache(async (qrId: string) => {
  return db
    .select({ id: collections.id, title: collections.title })
    .from(qrCollections)
    .innerJoin(collections, eq(qrCollections.collectionId, collections.id))
    .where(eq(qrCollections.qrId, qrId));
});

export async function listQrCards(
  opts: { search?: string; collectionId?: string } = {},
): Promise<QrCard[]> {
  const filters = [];
  if (opts.search) {
    const needle = `%${opts.search}%`;
    filters.push(
      or(ilike(qrs.title, needle), ilike(qrs.url, needle), ilike(qrs.description, needle))!,
    );
  }
  if (opts.collectionId) {
    const inCollection = db
      .select({ id: qrCollections.qrId })
      .from(qrCollections)
      .where(eq(qrCollections.collectionId, opts.collectionId));
    filters.push(inArray(qrs.id, inCollection));
  }
  return db
    .select({ id: qrs.id, title: qrs.title, url: qrs.url })
    .from(qrs)
    .where(filters.length ? and(...filters) : undefined)
    .orderBy(desc(qrs.createdAt));
}
