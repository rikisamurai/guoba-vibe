import type { VaultData } from "@/lib/storage";
import { parseDeepLink } from "@/lib/url";

export function searchQrs(data: VaultData, search: string) {
  const normalized = search.trim().toLowerCase();
  if (!normalized) return data.qrs;

  return data.qrs.filter((qr) => {
    const parsed = parseDeepLink(qr.url);
    return [qr.title, qr.description, qr.url, parsed.scheme, parsed.path, ...Object.keys(parsed.query), ...Object.values(parsed.query)]
      .filter(Boolean)
      .some((value) => value!.toLowerCase().includes(normalized));
  });
}

export function getQrsForCollection(data: VaultData, collectionId: string) {
  const qrIds = new Set(data.collectionItems.filter((item) => item.collectionId === collectionId).map((item) => item.qrId));
  return data.qrs.filter((qr) => qrIds.has(qr.id));
}
