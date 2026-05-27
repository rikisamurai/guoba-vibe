import { nanoid8 } from "@/lib/ids";
import type { VaultData } from "@/lib/storage";

export function buildDemoVault(): VaultData {
  const now = new Date().toISOString();

  const collections = [
    { id: nanoid8(), title: "Search & Reference", description: "Everyday lookups" },
    { id: nanoid8(), title: "Dev Tools", description: "Build / ship workflows" },
  ];

  const qrs = [
    { id: nanoid8(), title: "Google", url: "https://www.google.com", collectionId: collections[0].id },
    { id: nanoid8(), title: "YouTube", url: "https://www.youtube.com", collectionId: collections[0].id },
    { id: nanoid8(), title: "MDN", url: "https://developer.mozilla.org", collectionId: collections[0].id },
    { id: nanoid8(), title: "GitHub", url: "https://github.com", collectionId: collections[1].id },
    { id: nanoid8(), title: "Vercel", url: "https://vercel.com", collectionId: collections[1].id },
    { id: nanoid8(), title: "Linear", url: "https://linear.app", collectionId: collections[1].id },
  ];

  return {
    version: 1,
    qrs: qrs.map(({ id, title, url }) => ({
      id,
      title,
      url,
      createdAt: now,
      updatedAt: now,
    })),
    collections: collections.map(({ id, title, description }) => ({
      id,
      title,
      description,
      createdAt: now,
      updatedAt: now,
    })),
    collectionItems: qrs.map(({ id, collectionId }) => ({
      collectionId,
      qrId: id,
    })),
  };
}
