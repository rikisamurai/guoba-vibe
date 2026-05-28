// Pure path-set helpers. Kept separate from revalidate.ts (which pulls in
// `server-only` + `next/cache`) so they can be unit-tested in vitest's
// node environment.

// `/admin` is intentionally excluded — it's cookie-gated and stays dynamically
// rendered, so revalidatePath is a no-op there.
export function qrAffectedPaths(qrId: string, collectionIds: string[]): string[] {
  const uniqueCollections = Array.from(new Set(collectionIds));
  return [`/q/${qrId}`, ...uniqueCollections.map((cid) => `/c/${cid}`)];
}

// Cascades into every QR detail page in the collection, because each one
// renders the collection title as a pill (see app/q/[id]/page.tsx).
export function collectionAffectedPaths(collectionId: string, qrIds: string[]): string[] {
  const uniqueQrs = Array.from(new Set(qrIds));
  return [`/c/${collectionId}`, ...uniqueQrs.map((qid) => `/q/${qid}`)];
}
