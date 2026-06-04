import 'server-only'
import { asc, eq } from 'drizzle-orm'
import { cache } from 'react'

import { db } from '@/db/client'
import { collections, qrCollections, qrs } from '@/db/schema'

export type CollectionNav = {
  allCount: number
  uncategorizedCount: number
  collections: Array<{ id: string; title: string; count: number }>
}

export const getCollectionById = cache(async (id: string) => {
  const [row] = await db.select().from(collections).where(eq(collections.id, id)).limit(1)
  return row ?? null
})

export async function listCollections() {
  return db
    .select({ id: collections.id, title: collections.title })
    .from(collections)
    .orderBy(asc(collections.title))
}

export async function getCollectionNav(): Promise<CollectionNav> {
  const [cols, links, qrRows] = await Promise.all([
    listCollections(),
    db
      .select({ collectionId: qrCollections.collectionId, qrId: qrCollections.qrId })
      .from(qrCollections),
    db.select({ id: qrs.id }).from(qrs),
  ])

  const countByCollection = new Map<string, number>()
  const assignedQrIds = new Set<string>()
  for (const link of links) {
    countByCollection.set(link.collectionId, (countByCollection.get(link.collectionId) ?? 0) + 1)
    assignedQrIds.add(link.qrId)
  }

  return {
    allCount: qrRows.length,
    uncategorizedCount: qrRows.filter((qr) => !assignedQrIds.has(qr.id)).length,
    collections: cols.map((collection) => ({
      ...collection,
      count: countByCollection.get(collection.id) ?? 0,
    })),
  }
}
