import 'server-only'
import { and, desc, eq, inArray, notInArray } from 'drizzle-orm'
import { cache } from 'react'

import { db } from '@/db/client'
import { qrs, qrCollections, collections } from '@/db/schema'
import { qrMatchesSearch } from '@/lib/qr-search'

export type QrCard = { id: string; title: string; url: string }

export const getQrById = cache(async (id: string) => {
  const [row] = await db.select().from(qrs).where(eq(qrs.id, id)).limit(1)
  return row ?? null
})

export const getQrCollections = cache(async (qrId: string) => {
  return db
    .select({ id: collections.id, title: collections.title })
    .from(qrCollections)
    .innerJoin(collections, eq(qrCollections.collectionId, collections.id))
    .where(eq(qrCollections.qrId, qrId))
})

export async function listQrCards(
  opts: { search?: string; collectionId?: string; uncategorized?: boolean } = {},
): Promise<QrCard[]> {
  const filters = []
  if (opts.collectionId) {
    const inCollection = db
      .select({ id: qrCollections.qrId })
      .from(qrCollections)
      .where(eq(qrCollections.collectionId, opts.collectionId))
    filters.push(inArray(qrs.id, inCollection))
  } else if (opts.uncategorized) {
    const assigned = db.select({ id: qrCollections.qrId }).from(qrCollections)
    filters.push(notInArray(qrs.id, assigned))
  }

  const rows = await db
    .select({
      id: qrs.id,
      title: qrs.title,
      description: qrs.description,
      url: qrs.url,
    })
    .from(qrs)
    .where(filters.length ? and(...filters) : undefined)
    .orderBy(desc(qrs.updatedAt), desc(qrs.createdAt))

  return rows
    .filter((row) => qrMatchesSearch(row, opts.search ?? ''))
    .map(({ id, title, url }) => ({ id, title, url }))
}
