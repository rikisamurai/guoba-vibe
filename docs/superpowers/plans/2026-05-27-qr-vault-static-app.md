# QR Vault Static App Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build `apps/qr-vault`, a static local-first React app for collecting, editing, previewing, importing, exporting, and sharing mobile deep-link QR codes.

**Architecture:** The app is a Vite React SPA using TanStack Router with hash history, so it can be deployed as static files without server rewrites. localStorage stores one versioned vault document; all parsed URL fields, QR images, and share links are derived at runtime.

**Tech Stack:** pnpm workspace · Vite · React · TypeScript · TanStack Router · localStorage · `qrcode` · `nanoid` · Vitest · CSS modules via plain app CSS.

---

## File Structure

```
apps/qr-vault/
├─ package.json                         # app scripts and dependencies
├─ index.html                           # Vite root HTML
├─ tsconfig.json                        # app TS config
├─ vite.config.ts                       # React plugin, @ alias, Vitest config
└─ src/
   ├─ main.tsx                          # React bootstrap
   ├─ styles.css                        # full app styling
   ├─ router.tsx                        # TanStack code-based route tree
   ├─ app/
   │  ├─ app-shell.tsx                  # root layout and navigation
   │  ├─ workspace-page.tsx             # / workspace
   │  ├─ collections-page.tsx           # /collections and /collections/$collectionId
   │  ├─ qr-detail-page.tsx             # /q/$qrId and /new
   │  ├─ share-page.tsx                 # /share
   │  └─ import-export-page.tsx         # /import
   ├─ components/
   │  ├─ qr-preview.tsx                 # large QR rendering and fallback
   │  ├─ parsed-url-panel.tsx           # scheme/path/query display
   │  ├─ url-editor.tsx                 # full URL and structured editor
   │  ├─ collection-picker.tsx          # multi-collection membership
   │  └─ copy-button.tsx                # clipboard command
   ├─ lib/
   │  ├─ ids.ts                         # nanoid8
   │  ├─ qr.ts                          # browser QR rendering helper
   │  ├─ storage.ts                     # localStorage load/save/import/export
   │  ├─ url.ts                         # parse/build/share URL helpers
   │  └─ vault.ts                       # in-memory domain operations
   └─ tests/
      ├─ url.test.ts
      └─ storage.test.ts
```

Root files:

```
package.json                            # add qr-vault scripts only
pnpm-lock.yaml                          # dependency lockfile update
```

Do not modify `apps/qr-codes` for this feature.

---

## Task 1: Scaffold `apps/qr-vault`

**Files:**
- Create: `apps/qr-vault/package.json`
- Create: `apps/qr-vault/index.html`
- Create: `apps/qr-vault/tsconfig.json`
- Create: `apps/qr-vault/vite.config.ts`
- Create: `apps/qr-vault/src/main.tsx`
- Create: `apps/qr-vault/src/styles.css`
- Modify: `package.json`
- Modify: `pnpm-lock.yaml`

- [ ] **Step 1: Create app package**

Create `apps/qr-vault/package.json`:

```json
{
  "name": "qr-vault",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite --host 0.0.0.0",
    "build": "tsc -b && vite build",
    "preview": "vite preview --host 0.0.0.0",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "dependencies": {
    "@tanstack/react-router": "^1.139.3",
    "lucide-react": "^1.16.0",
    "nanoid": "^5.1.11",
    "qrcode": "^1.5.4",
    "react": "19.2.4",
    "react-dom": "19.2.4"
  },
  "devDependencies": {
    "@types/node": "^24.12.4",
    "@types/qrcode": "^1.5.6",
    "@types/react": "^19",
    "@types/react-dom": "^19",
    "@vitejs/plugin-react": "^5.1.1",
    "typescript": "^5",
    "vite": "^8.0.14",
    "vitest": "^4.1.7"
  }
}
```

- [ ] **Step 2: Add root scripts without changing existing `qr-codes` defaults**

Modify root `package.json` scripts:

```json
"dev:qr-vault": "pnpm --filter qr-vault dev",
"build:qr-vault": "pnpm --filter qr-vault build",
"preview:qr-vault": "pnpm --filter qr-vault preview",
"test:qr-vault": "pnpm --filter qr-vault test"
```

Keep existing `dev`, `build`, `start`, `lint`, and `test` scripts pointed at `qr-codes`.

- [ ] **Step 3: Create Vite shell files**

Create `apps/qr-vault/index.html`:

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>QR Vault</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

Create `apps/qr-vault/tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "useDefineForClassFields": true,
    "lib": ["DOM", "DOM.Iterable", "ES2022"],
    "allowJs": false,
    "skipLibCheck": true,
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,
    "strict": true,
    "forceConsistentCasingInFileNames": true,
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"]
    }
  },
  "include": ["src", "vite.config.ts"]
}
```

Create `apps/qr-vault/vite.config.ts`:

```ts
import path from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
  },
});
```

Create a temporary `apps/qr-vault/src/main.tsx`:

```tsx
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./styles.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <main className="boot-screen">
      <h1>QR Vault</h1>
      <p>Static deeplink QR manager</p>
    </main>
  </StrictMode>
);
```

Create a temporary `apps/qr-vault/src/styles.css`:

```css
:root {
  color: #151513;
  background: #f6f4ef;
  font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
}

body {
  margin: 0;
}

.boot-screen {
  min-height: 100vh;
  display: grid;
  place-items: center;
}
```

- [ ] **Step 4: Install dependencies**

Run:

```bash
pnpm install
```

Expected: lockfile updates with the `qr-vault` importer.

- [ ] **Step 5: Verify scaffold**

Run:

```bash
pnpm --filter qr-vault build
```

Expected: `tsc -b && vite build` exits 0.

- [ ] **Step 6: Commit scaffold**

```bash
git add package.json pnpm-lock.yaml apps/qr-vault
git commit -m "feat(qr-vault): scaffold static React app"
```

---

## Task 2: URL and QR domain helpers

**Files:**
- Create: `apps/qr-vault/src/lib/url.ts`
- Create: `apps/qr-vault/src/lib/qr.ts`
- Create: `apps/qr-vault/src/tests/url.test.ts`

- [ ] **Step 1: Write failing URL tests**

Create `apps/qr-vault/src/tests/url.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import {
  buildSharePath,
  buildUrlFromParts,
  normalizeQueryRows,
  parseDeepLink,
} from "@/lib/url";

describe("parseDeepLink", () => {
  it("parses a xhsdiscover deeplink with query", () => {
    const result = parseDeepLink("xhsdiscover://rn/wakanda/buyer-conversion?sku_id=1&item_id=2");

    expect(result).toEqual({
      raw: "xhsdiscover://rn/wakanda/buyer-conversion?sku_id=1&item_id=2",
      isValid: true,
      scheme: "xhsdiscover",
      path: "rn/wakanda/buyer-conversion",
      query: { sku_id: "1", item_id: "2" },
    });
  });

  it("collapses repeated query keys to the last value", () => {
    expect(parseDeepLink("xhsdiscover://rn/page?tag=a&tag=b").query).toEqual({ tag: "b" });
  });

  it("keeps incomplete text invalid while preserving raw input", () => {
    expect(parseDeepLink("xhsdiscover://").isValid).toBe(false);
    expect(parseDeepLink("xhsdiscover://").raw).toBe("xhsdiscover://");
  });
});

describe("buildUrlFromParts", () => {
  it("rebuilds a deeplink from scheme, path, and query rows", () => {
    expect(
      buildUrlFromParts({
        scheme: "xhsdiscover",
        path: "rn/wakanda/buyer-conversion",
        query: { sku_id: "1", item_id: "2" },
      })
    ).toBe("xhsdiscover://rn/wakanda/buyer-conversion?sku_id=1&item_id=2");
  });

  it("encodes query values and ignores empty keys", () => {
    expect(
      buildUrlFromParts({
        scheme: "xhsdiscover",
        path: "rn/page",
        query: { keyword: "中文 商品", "": "ignored" },
      })
    ).toBe("xhsdiscover://rn/page?keyword=%E4%B8%AD%E6%96%87+%E5%95%86%E5%93%81");
  });
});

describe("normalizeQueryRows", () => {
  it("turns rows into a key-value map and drops empty keys", () => {
    expect(
      normalizeQueryRows([
        { key: "sku_id", value: "1" },
        { key: "", value: "ignored" },
        { key: "item_id", value: "2" },
      ])
    ).toEqual({ sku_id: "1", item_id: "2" });
  });
});

describe("buildSharePath", () => {
  it("builds a self-contained share route with optional title and description", () => {
    const path = buildSharePath({
      url: "xhsdiscover://rn/wakanda/buyer-conversion?sku_id=1",
      title: "Buyer",
      description: "Debug QR",
    });

    expect(path).toContain("/share?");
    expect(path).toContain("url=");
    expect(path).toContain("title=Buyer");
    expect(path).toContain("description=Debug+QR");
  });
});
```

- [ ] **Step 2: Run tests red**

Run:

```bash
pnpm --filter qr-vault test -- url
```

Expected: FAIL because `@/lib/url` does not exist.

- [ ] **Step 3: Implement URL helpers**

Create `apps/qr-vault/src/lib/url.ts`:

```ts
export type ParsedDeepLink = {
  raw: string;
  scheme: string;
  path: string;
  query: Record<string, string>;
  isValid: boolean;
};

export type QueryRow = {
  key: string;
  value: string;
};

export type UrlParts = {
  scheme: string;
  path: string;
  query: Record<string, string>;
};

const SCHEME_SEPARATOR = "://";

export function parseDeepLink(input: string): ParsedDeepLink {
  const raw = input.trim();
  const empty = { raw, scheme: "", path: "", query: {}, isValid: false };
  if (!raw) return empty;

  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    return empty;
  }

  const scheme = parsed.protocol.replace(/:$/, "");
  const path = extractPath(raw, scheme);
  if (!scheme || !path) return { ...empty, scheme, path };

  const query: Record<string, string> = {};
  parsed.searchParams.forEach((value, key) => {
    query[key] = value;
  });

  return { raw, scheme, path, query, isValid: true };
}

export function buildUrlFromParts(parts: UrlParts): string {
  const scheme = parts.scheme.trim().replace(/:$/, "");
  const path = parts.path.trim().replace(/^\/+/, "");
  const searchParams = new URLSearchParams();

  Object.entries(parts.query).forEach(([key, value]) => {
    const normalizedKey = key.trim();
    if (normalizedKey) searchParams.set(normalizedKey, value);
  });

  const queryString = searchParams.toString();
  return `${scheme}${SCHEME_SEPARATOR}${path}${queryString ? `?${queryString}` : ""}`;
}

export function normalizeQueryRows(rows: QueryRow[]): Record<string, string> {
  const query: Record<string, string> = {};
  rows.forEach((row) => {
    const key = row.key.trim();
    if (key) query[key] = row.value;
  });
  return query;
}

export function queryToRows(query: Record<string, string>): QueryRow[] {
  return Object.entries(query).map(([key, value]) => ({ key, value }));
}

export function buildSharePath(input: {
  url: string;
  title?: string;
  description?: string;
}): string {
  const params = new URLSearchParams();
  params.set("url", input.url);
  if (input.title) params.set("title", input.title);
  if (input.description) params.set("description", input.description);
  return `/share?${params.toString()}`;
}

function extractPath(raw: string, scheme: string): string {
  const queryStart = raw.indexOf("?");
  const hashStart = raw.indexOf("#");
  const delimiters = [queryStart, hashStart].filter((index) => index !== -1);
  const cut = delimiters.length ? Math.min(...delimiters) : raw.length;
  const beforeQueryOrHash = raw.slice(0, cut);
  const separatorIndex = beforeQueryOrHash.indexOf(SCHEME_SEPARATOR);

  if (separatorIndex === -1) {
    return beforeQueryOrHash.slice(scheme.length + 1);
  }

  return beforeQueryOrHash.slice(separatorIndex + SCHEME_SEPARATOR.length);
}
```

- [ ] **Step 4: Implement QR browser helper**

Create `apps/qr-vault/src/lib/qr.ts`:

```ts
import QRCode from "qrcode";

export async function renderQrDataUrl(data: string, width = 512): Promise<string> {
  if (!data.trim()) throw new Error("renderQrDataUrl: data is required");

  return QRCode.toDataURL(data, {
    width,
    margin: 2,
    errorCorrectionLevel: "M",
  });
}
```

- [ ] **Step 5: Run tests green**

Run:

```bash
pnpm --filter qr-vault test -- url
```

Expected: PASS.

- [ ] **Step 6: Commit URL helpers**

```bash
git add apps/qr-vault/src/lib apps/qr-vault/src/tests/url.test.ts
git commit -m "feat(qr-vault): add deeplink parsing helpers"
```

---

## Task 3: Vault storage and domain operations

**Files:**
- Create: `apps/qr-vault/src/lib/ids.ts`
- Create: `apps/qr-vault/src/lib/storage.ts`
- Create: `apps/qr-vault/src/lib/vault.ts`
- Create: `apps/qr-vault/src/tests/storage.test.ts`

- [ ] **Step 1: Write failing storage tests**

Create `apps/qr-vault/src/tests/storage.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import {
  createEmptyVault,
  mergeVaultData,
  parseVaultData,
  replaceVaultData,
  upsertQr,
} from "@/lib/storage";

const baseVault = createEmptyVault();

describe("parseVaultData", () => {
  it("accepts a valid versioned vault document", () => {
    expect(parseVaultData(JSON.stringify(baseVault))).toEqual(baseVault);
  });

  it("returns null for invalid JSON or invalid shape", () => {
    expect(parseVaultData("{")).toBeNull();
    expect(parseVaultData(JSON.stringify({ version: 2 }))).toBeNull();
  });
});

describe("mergeVaultData", () => {
  it("overwrites same-id records and keeps local-only records", () => {
    const local = {
      version: 1 as const,
      qrs: [
        { id: "local", title: "Local", url: "xhsdiscover://rn/local", createdAt: "1", updatedAt: "1" },
        { id: "same", title: "Old", url: "xhsdiscover://rn/old", createdAt: "1", updatedAt: "1" },
      ],
      collections: [{ id: "c1", title: "Local collection", createdAt: "1", updatedAt: "1" }],
      collectionItems: [{ collectionId: "c1", qrId: "local" }],
    };
    const incoming = {
      version: 1 as const,
      qrs: [{ id: "same", title: "New", url: "xhsdiscover://rn/new", createdAt: "2", updatedAt: "2" }],
      collections: [{ id: "c2", title: "Imported", createdAt: "2", updatedAt: "2" }],
      collectionItems: [{ collectionId: "c2", qrId: "same" }],
    };

    const merged = mergeVaultData(local, incoming);

    expect(merged.qrs.map((qr) => qr.id).sort()).toEqual(["local", "same"]);
    expect(merged.qrs.find((qr) => qr.id === "same")?.title).toBe("New");
    expect(merged.collections.map((collection) => collection.id).sort()).toEqual(["c1", "c2"]);
    expect(merged.collectionItems).toEqual([
      { collectionId: "c1", qrId: "local" },
      { collectionId: "c2", qrId: "same" },
    ]);
  });
});

describe("replaceVaultData", () => {
  it("returns the incoming document unchanged", () => {
    const incoming = {
      version: 1 as const,
      qrs: [{ id: "incoming", url: "xhsdiscover://rn/incoming", createdAt: "2", updatedAt: "2" }],
      collections: [],
      collectionItems: [],
    };

    expect(replaceVaultData(baseVault, incoming)).toEqual(incoming);
  });
});

describe("upsertQr", () => {
  it("adds a new QR and links multiple collections", () => {
    const result = upsertQr(
      {
        ...baseVault,
        collections: [
          { id: "a", title: "A", createdAt: "1", updatedAt: "1" },
          { id: "b", title: "B", createdAt: "1", updatedAt: "1" },
        ],
      },
      {
        title: "Buyer",
        url: "xhsdiscover://rn/wakanda/buyer-conversion",
        collectionIds: ["a", "b"],
      },
      "now"
    );

    expect(result.qrs).toHaveLength(1);
    expect(result.collectionItems).toEqual([
      { collectionId: "a", qrId: result.qrs[0].id },
      { collectionId: "b", qrId: result.qrs[0].id },
    ]);
  });
});
```

- [ ] **Step 2: Run tests red**

Run:

```bash
pnpm --filter qr-vault test -- storage
```

Expected: FAIL because `@/lib/storage` does not exist.

- [ ] **Step 3: Implement ID helper**

Create `apps/qr-vault/src/lib/ids.ts`:

```ts
import { customAlphabet } from "nanoid";

const alphabet = "23456789abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ";

export const nanoid8 = customAlphabet(alphabet, 8);
```

- [ ] **Step 4: Implement storage and vault operations**

Create `apps/qr-vault/src/lib/storage.ts`:

```ts
import { nanoid8 } from "@/lib/ids";

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
  if (!raw) return createEmptyVault();
  return parseVaultData(raw) ?? createEmptyVault();
}

export function saveVault(data: VaultData, storage: Storage = window.localStorage): void {
  storage.setItem(VAULT_STORAGE_KEY, JSON.stringify(data, null, 2));
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

export function upsertQr(data: VaultData, input: SaveQrInput, now = new Date().toISOString()): VaultData {
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
  const collectionIds = input.collectionIds ?? data.collectionItems.filter((item) => item.qrId === id).map((item) => item.collectionId);
  const collectionItems = [
    ...data.collectionItems.filter((item) => item.qrId !== id),
    ...collectionIds.map((collectionId) => ({ collectionId, qrId: id })),
  ];

  return { ...data, qrs, collectionItems };
}

export function upsertCollection(
  data: VaultData,
  input: { id?: string; title: string; description?: string },
  now = new Date().toISOString()
): VaultData {
  const existing = input.id ? data.collections.find((collection) => collection.id === input.id) : undefined;
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

function mergeCollectionItems(local: CollectionItem[], incoming: CollectionItem[]): CollectionItem[] {
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
    candidate.collections.every((collection) => typeof collection.id === "string" && typeof collection.title === "string") &&
    candidate.collectionItems.every(
      (item) => typeof item.collectionId === "string" && typeof item.qrId === "string"
    )
  );
}
```

Create `apps/qr-vault/src/lib/vault.ts`:

```ts
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
```

- [ ] **Step 5: Run tests green**

Run:

```bash
pnpm --filter qr-vault test -- storage
```

Expected: PASS.

- [ ] **Step 6: Commit storage**

```bash
git add apps/qr-vault/src/lib apps/qr-vault/src/tests/storage.test.ts
git commit -m "feat(qr-vault): add local vault storage"
```

---

## Task 4: Router and app shell

**Files:**
- Create: `apps/qr-vault/src/router.tsx`
- Create: `apps/qr-vault/src/app/app-shell.tsx`
- Create: `apps/qr-vault/src/app/workspace-page.tsx`
- Create: `apps/qr-vault/src/app/collections-page.tsx`
- Create: `apps/qr-vault/src/app/qr-detail-page.tsx`
- Create: `apps/qr-vault/src/app/share-page.tsx`
- Create: `apps/qr-vault/src/app/import-export-page.tsx`
- Modify: `apps/qr-vault/src/main.tsx`

- [ ] **Step 1: Add page placeholders**

Create simple page modules exporting named components:

```tsx
export function WorkspacePage() {
  return <div className="page-panel">Workspace</div>;
}
```

Repeat the pattern for `CollectionsPage`, `QrDetailPage`, `SharePage`, and `ImportExportPage`.

- [ ] **Step 2: Add app shell**

Create `apps/qr-vault/src/app/app-shell.tsx`:

```tsx
import { Link, Outlet } from "@tanstack/react-router";
import { Database, Folder, Import, Plus, QrCode } from "lucide-react";

export function AppShell() {
  return (
    <div className="app-shell">
      <aside className="rail">
        <Link to="/" className="brand">
          <QrCode aria-hidden="true" />
          <span>QR Vault</span>
        </Link>
        <nav className="nav-list" aria-label="Primary">
          <Link to="/" activeProps={{ className: "active" }}>
            <Database aria-hidden="true" /> Vault
          </Link>
          <Link to="/collections" activeProps={{ className: "active" }}>
            <Folder aria-hidden="true" /> Collections
          </Link>
          <Link to="/new" search={{ url: "" }} activeProps={{ className: "active" }}>
            <Plus aria-hidden="true" /> New QR
          </Link>
          <Link to="/import" activeProps={{ className: "active" }}>
            <Import aria-hidden="true" /> Import
          </Link>
        </nav>
      </aside>
      <main className="app-main">
        <Outlet />
      </main>
    </div>
  );
}
```

- [ ] **Step 3: Add TanStack Router with hash history**

Create `apps/qr-vault/src/router.tsx` using code-based routes:

```tsx
import {
  RouterProvider,
  createHashHistory,
  createRootRoute,
  createRoute,
  createRouter,
} from "@tanstack/react-router";
import { AppShell } from "@/app/app-shell";
import { CollectionsPage } from "@/app/collections-page";
import { ImportExportPage } from "@/app/import-export-page";
import { QrDetailPage } from "@/app/qr-detail-page";
import { SharePage } from "@/app/share-page";
import { WorkspacePage } from "@/app/workspace-page";

const rootRoute = createRootRoute({ component: AppShell });

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: WorkspacePage,
});

const collectionsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/collections",
  component: CollectionsPage,
});

const collectionDetailRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/collections/$collectionId",
  component: CollectionsPage,
});

const qrDetailRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/q/$qrId",
  component: QrDetailPage,
});

const newRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/new",
  validateSearch: (search: Record<string, unknown>) => ({
    url: typeof search.url === "string" ? search.url : "",
  }),
  component: QrDetailPage,
});

const shareRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/share",
  validateSearch: (search: Record<string, unknown>) => ({
    url: typeof search.url === "string" ? search.url : "",
    title: typeof search.title === "string" ? search.title : "",
    description: typeof search.description === "string" ? search.description : "",
  }),
  component: SharePage,
});

const importRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/import",
  component: ImportExportPage,
});

const routeTree = rootRoute.addChildren([
  indexRoute,
  collectionsRoute,
  collectionDetailRoute,
  qrDetailRoute,
  newRoute,
  shareRoute,
  importRoute,
]);

export const router = createRouter({
  routeTree,
  history: createHashHistory(),
});

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

export function AppRouter() {
  return <RouterProvider router={router} />;
}
```

- [ ] **Step 4: Mount router**

Replace `apps/qr-vault/src/main.tsx`:

```tsx
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { AppRouter } from "@/router";
import "./styles.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <AppRouter />
  </StrictMode>
);
```

- [ ] **Step 5: Verify route build**

Run:

```bash
pnpm --filter qr-vault build
```

Expected: PASS.

- [ ] **Step 6: Commit router**

```bash
git add apps/qr-vault/src
git commit -m "feat(qr-vault): add static app router"
```

---

## Task 5: Build QR UI workflow

**Files:**
- Modify: `apps/qr-vault/src/app/workspace-page.tsx`
- Modify: `apps/qr-vault/src/app/collections-page.tsx`
- Modify: `apps/qr-vault/src/app/qr-detail-page.tsx`
- Modify: `apps/qr-vault/src/app/share-page.tsx`
- Create: `apps/qr-vault/src/components/qr-preview.tsx`
- Create: `apps/qr-vault/src/components/parsed-url-panel.tsx`
- Create: `apps/qr-vault/src/components/url-editor.tsx`
- Create: `apps/qr-vault/src/components/collection-picker.tsx`
- Create: `apps/qr-vault/src/components/copy-button.tsx`
- Modify: `apps/qr-vault/src/styles.css`

- [ ] **Step 1: Implement reusable components**

Create components with these responsibilities:

- `QrPreview`: calls `renderQrDataUrl(url)` in an effect and shows the QR image.
- `ParsedUrlPanel`: renders scheme, path, and query table from `parseDeepLink(url)`.
- `UrlEditor`: exposes full URL input, scheme/path inputs, and query row inputs; emits rebuilt URL through `onChange`.
- `CollectionPicker`: checkbox list for multi-collection membership.
- `CopyButton`: uses `navigator.clipboard.writeText`.

- [ ] **Step 2: Implement workspace**

`WorkspacePage` should:

- load vault from localStorage
- show search input
- show collection shortcuts
- show QR cards with title, parsed path, and collection count
- link each QR card to `/q/$qrId`
- include a quick URL input that links to `/new?url=<value>`

- [ ] **Step 3: Implement QR detail and new page**

`QrDetailPage` should:

- detect whether it is on `/new` or `/q/$qrId`
- load existing QR by route param when editing
- prefill from `url` search param when creating
- allow title, description, full URL, structured URL, and collection membership edits
- save through `upsertQr`
- after save, navigate to `/q/$qrId`
- render a share path from `buildSharePath`

- [ ] **Step 4: Implement collections page**

`CollectionsPage` should:

- list all collections at `/collections`
- create/update simple collection title and description
- at `/collections/$collectionId`, filter QR cards to the selected collection
- preserve many-to-many membership via the QR detail page

- [ ] **Step 5: Implement share page**

`SharePage` should:

- read typed search params from the route
- render QR and parsed URL without requiring local storage
- show optional title and description
- save to local storage with `upsertQr`
- navigate to `/q/$qrId`

- [ ] **Step 6: Style the app**

Use `styles.css` to create a restrained developer-tool interface:

- split desktop workspace
- readable mobile stacking
- fixed QR preview dimensions
- button and input states
- no marketing hero
- no nested card shells

- [ ] **Step 7: Verify UI build**

Run:

```bash
pnpm --filter qr-vault build
```

Expected: PASS.

- [ ] **Step 8: Commit UI workflow**

```bash
git add apps/qr-vault/src
git commit -m "feat(qr-vault): build local QR workflow"
```

---

## Task 6: Import/export workflow

**Files:**
- Modify: `apps/qr-vault/src/app/import-export-page.tsx`
- Modify: `apps/qr-vault/src/lib/storage.ts`
- Modify: `apps/qr-vault/src/tests/storage.test.ts`

- [ ] **Step 1: Add failing import/export tests**

Extend `storage.test.ts` with tests for:

```ts
import { exportVaultJson } from "@/lib/storage";

it("exports pretty JSON that can be parsed back into vault data", () => {
  const exported = exportVaultJson({
    version: 1,
    qrs: [],
    collections: [],
    collectionItems: [],
  });

  expect(JSON.parse(exported)).toEqual({
    version: 1,
    qrs: [],
    collections: [],
    collectionItems: [],
  });
});
```

- [ ] **Step 2: Run test red**

Run:

```bash
pnpm --filter qr-vault test -- storage
```

Expected: FAIL because `exportVaultJson` does not exist.

- [ ] **Step 3: Implement export helper**

Add to `storage.ts`:

```ts
export function exportVaultJson(data: VaultData): string {
  return JSON.stringify(data, null, 2);
}
```

- [ ] **Step 4: Implement import/export page**

`ImportExportPage` should:

- show export button that downloads `qr-vault-export.json`
- show file input for JSON import
- merge by default
- show a separate replace button/action for clearing local data then importing
- keep local data unchanged when parse/validation fails

- [ ] **Step 5: Run tests and build**

Run:

```bash
pnpm --filter qr-vault test
pnpm --filter qr-vault build
```

Expected: both PASS.

- [ ] **Step 6: Commit import/export**

```bash
git add apps/qr-vault/src
git commit -m "feat(qr-vault): add vault import export"
```

---

## Task 7: Browser verification and polish

**Files:**
- Modify as needed inside `apps/qr-vault/src`

- [ ] **Step 1: Start dev server**

Run:

```bash
pnpm --filter qr-vault dev
```

Expected: Vite serves the app, usually on `http://localhost:5173`.

- [ ] **Step 2: Verify manually in browser**

Use browser automation against the dev URL:

- open `/#/new?url=xhsdiscover%3A%2F%2Frn%2Fwakanda%2Fbuyer-conversion%3Fsku_id%3D1%26item_id%3D2`
- save the QR
- verify navigation lands on `/#/q/<id>`
- edit path or query and save again
- open generated `/#/share?...`
- save from the share page
- create two collections and assign one QR to both
- export JSON
- replace local data with the exported JSON

- [ ] **Step 3: Final verification**

Run:

```bash
pnpm --filter qr-vault test
pnpm --filter qr-vault build
```

Expected: both PASS.

- [ ] **Step 4: Commit polish if needed**

```bash
git add apps/qr-vault/src
git commit -m "fix(qr-vault): polish static QR vault workflow"
```

Only create this commit if verification required code changes after Task 6.

---

## Self-Review Checklist

- Spec coverage: routes, localStorage data, URL edit sync, self-contained sharing, optional title/description, merge import, replace import, and UI verification all map to tasks above.
- Scope: no server, auth, database, remote sync, QR image persistence, or repeated query-key support.
- Type consistency: persisted data uses `VaultData`, `QRCodeItem`, `Collection`, and `CollectionItem` consistently across storage and UI tasks.
- Test plan: core URL and storage behavior is TDD; UI is verified through build plus browser workflow.
