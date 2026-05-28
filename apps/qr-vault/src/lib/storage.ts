import { nanoid8 } from "@/lib/ids";
import { buildDemoVault } from "@/lib/demo-seed";

export const VAULT_STORAGE_KEY = "qr-vault:data";

export type QRCodeItem = {
  id: string;
  title?: string;
  description?: string;
  url: string;
  createdAt: string;
  updatedAt: string;
};

export type Collection = {
  id: string;
  title: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
};

export type CollectionItem = {
  collectionId: string;
  qrId: string;
};

export type VaultData = {
  version: 1;
  qrs: QRCodeItem[];
  collections: Collection[];
  collectionItems: CollectionItem[];
};

export type SaveQrInput = {
  id?: string;
  title?: string;
  description?: string;
  url: string;
  collectionIds?: string[];
};

export function createEmptyVault(): VaultData {
  return { version: 1, qrs: [], collections: [], collectionItems: [] };
}

export function parseVaultData(raw: string): VaultData | null {
  try {
    const parsed = JSON.parse(raw) as unknown;
    return isVaultData(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function loadVault(storage: Storage = window.localStorage): VaultData {
  const raw = storage.getItem(VAULT_STORAGE_KEY);
  if (raw === null) {
    const seeded = buildDemoVault();
    saveVault(seeded, storage);
    return seeded;
  }
  return parseVaultData(raw) ?? createEmptyVault();
}

export function saveVault(data: VaultData, storage: Storage = window.localStorage): void {
  storage.setItem(VAULT_STORAGE_KEY, JSON.stringify(data, null, 2));
}

export function exportVaultJson(data: VaultData): string {
  return JSON.stringify(data, null, 2);
}

export function mergeVaultData(local: VaultData, incoming: VaultData): VaultData {
  return {
    version: 1,
    qrs: mergeById(local.qrs, incoming.qrs),
    collections: mergeById(local.collections, incoming.collections),
    collectionItems: mergeCollectionItems(local.collectionItems, incoming.collectionItems),
  };
}

export function replaceVaultData(_local: VaultData, incoming: VaultData): VaultData {
  return incoming;
}

export function upsertQr(
  data: VaultData,
  input: SaveQrInput,
  now = new Date().toISOString(),
): VaultData {
  const existing = input.id ? data.qrs.find((qr) => qr.id === input.id) : undefined;
  const id = existing?.id ?? input.id ?? nanoid8();
  const nextQr: QRCodeItem = {
    id,
    title: input.title?.trim() || undefined,
    description: input.description?.trim() || undefined,
    url: input.url,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  };
  const qrs = existing ? data.qrs.map((qr) => (qr.id === id ? nextQr : qr)) : [...data.qrs, nextQr];
  const collectionIds =
    input.collectionIds ??
    data.collectionItems.filter((item) => item.qrId === id).map((item) => item.collectionId);
  const collectionItems = [
    ...data.collectionItems.filter((item) => item.qrId !== id),
    ...collectionIds.map((collectionId) => ({ collectionId, qrId: id })),
  ];

  return { ...data, qrs, collectionItems };
}

export function deleteQr(data: VaultData, qrId: string): VaultData {
  return {
    ...data,
    qrs: data.qrs.filter((qr) => qr.id !== qrId),
    collectionItems: data.collectionItems.filter((item) => item.qrId !== qrId),
  };
}

export function upsertCollection(
  data: VaultData,
  input: { id?: string; title: string; description?: string },
  now = new Date().toISOString(),
): VaultData {
  const existing = input.id
    ? data.collections.find((collection) => collection.id === input.id)
    : undefined;
  const id = existing?.id ?? input.id ?? nanoid8();
  const nextCollection: Collection = {
    id,
    title: input.title.trim(),
    description: input.description?.trim() || undefined,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  };
  const collections = existing
    ? data.collections.map((collection) => (collection.id === id ? nextCollection : collection))
    : [...data.collections, nextCollection];

  return { ...data, collections };
}

function mergeById<T extends { id: string }>(local: T[], incoming: T[]): T[] {
  const map = new Map(local.map((item) => [item.id, item]));
  incoming.forEach((item) => map.set(item.id, item));
  return Array.from(map.values());
}

function mergeCollectionItems(
  local: CollectionItem[],
  incoming: CollectionItem[],
): CollectionItem[] {
  const map = new Map<string, CollectionItem>();
  [...local, ...incoming].forEach((item) => {
    map.set(`${item.collectionId}:${item.qrId}`, item);
  });
  return Array.from(map.values());
}

function isVaultData(value: unknown): value is VaultData {
  if (!value || typeof value !== "object") return false;
  const candidate = value as VaultData;
  return (
    candidate.version === 1 &&
    Array.isArray(candidate.qrs) &&
    Array.isArray(candidate.collections) &&
    Array.isArray(candidate.collectionItems) &&
    candidate.qrs.every((qr) => typeof qr.id === "string" && typeof qr.url === "string") &&
    candidate.collections.every(
      (collection) => typeof collection.id === "string" && typeof collection.title === "string",
    ) &&
    candidate.collectionItems.every(
      (item) => typeof item.collectionId === "string" && typeof item.qrId === "string",
    )
  );
}
