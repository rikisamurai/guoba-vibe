import 'server-only'
import { asc, eq } from 'drizzle-orm'
import { cache } from 'react'

import { db } from '@/db/client'
import { collections } from '@/db/schema'

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
