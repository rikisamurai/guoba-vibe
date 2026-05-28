import 'server-only'
import { revalidatePath } from 'next/cache'
import { qrAffectedPaths, collectionAffectedPaths } from './revalidate-paths'

export function revalidateQr(qrId: string, collectionIds: string[]): void {
  for (const p of qrAffectedPaths(qrId, collectionIds)) revalidatePath(p)
}

export function revalidateCollection(collectionId: string, qrIds: string[]): void {
  for (const p of collectionAffectedPaths(collectionId, qrIds)) revalidatePath(p)
}
