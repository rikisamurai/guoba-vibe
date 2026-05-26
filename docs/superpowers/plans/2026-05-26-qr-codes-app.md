# QR Codes App Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a personal QR code management web app where the admin manages QRs and Collections through a logged-in dashboard, and each QR/Collection has a public shareable detail page with the QR rendered, URL parsing, copy/download buttons, and OG preview.

**Architecture:** Single Next.js App Router app inside a `pnpm` workspace at `apps/qr-codes`. Server actions handle CRUD. Postgres (Neon) stores data via Drizzle ORM. Single-admin auth via better-auth + GitHub OAuth, gated by a whitelisted GitHub user ID env var. QR images are generated server-side as inline SVG (and PNG for download) by the `qrcode` package. Public detail pages are `noindex` and reachable only by link.

**Tech Stack:** pnpm workspaces · Next.js 15 App Router · TypeScript · Tailwind v4 · shadcn/ui · Drizzle ORM · Vercel Postgres (Neon) · better-auth · GitHub OAuth · `qrcode` · `@vercel/og` · `nanoid` · `vitest` · Vercel deploy.

---

## File Structure

```
guoba-vibe/
├─ pnpm-workspace.yaml
├─ package.json                       # root, private, workspace scripts
├─ .nvmrc                             # node 22
├─ .npmrc                             # auto-install-peers, strict-peer-deps
├─ docs/superpowers/plans/2026-05-26-qr-codes-app.md
└─ apps/qr-codes/
   ├─ package.json
   ├─ next.config.ts
   ├─ tsconfig.json
   ├─ tailwind.config.ts
   ├─ postcss.config.mjs
   ├─ components.json                 # shadcn/ui config
   ├─ drizzle.config.ts
   ├─ vitest.config.ts
   ├─ .env.example
   ├─ .env.local                      # gitignored, real values
   ├─ drizzle/                        # generated migration files
   └─ src/
      ├─ env.ts                       # zod-validated env
      ├─ middleware.ts                # /admin/** gate
      ├─ app/
      │  ├─ layout.tsx                # root layout (font, providers)
      │  ├─ globals.css
      │  ├─ page.tsx                  # unauth: login button + intro; auth: redirect to /admin
      │  ├─ login/page.tsx            # GitHub sign-in button
      │  ├─ (admin)/
      │  │  ├─ layout.tsx             # sidebar + auth guard
      │  │  ├─ admin/page.tsx         # QR grid (filter by ?c=<id>, search by ?q=)
      │  │  ├─ admin/qrs/new/page.tsx
      │  │  ├─ admin/qrs/[id]/edit/page.tsx
      │  │  ├─ admin/collections/new/page.tsx
      │  │  └─ admin/collections/[id]/edit/page.tsx
      │  ├─ q/[id]/
      │  │  ├─ page.tsx               # public QR detail
      │  │  └─ opengraph-image.tsx
      │  ├─ c/[id]/page.tsx           # public collection
      │  └─ api/
      │     ├─ auth/[...all]/route.ts # better-auth handler
      │     └─ qr/[id]/route.ts       # PNG/SVG download (?format=png|svg)
      ├─ db/
      │  ├─ schema.ts                 # collections, qrs, qr_collections + better-auth tables
      │  └─ client.ts                 # drizzle client (postgres-js)
      ├─ auth/
      │  ├─ server.ts                 # better-auth instance
      │  ├─ client.ts                 # better-auth/react client
      │  └─ admin.ts                  # requireAdmin() helper
      ├─ server/
      │  ├─ qrs.ts                    # createQr/updateQr/deleteQr
      │  └─ collections.ts            # createCollection/updateCollection/deleteCollection
      ├─ lib/
      │  ├─ url-parse.ts              # parseUrl()
      │  ├─ qr.ts                     # renderSvg(), renderPng()
      │  └─ nanoid.ts                 # nanoid8()
      ├─ components/
      │  ├─ ui/                       # shadcn primitives (installed by CLI)
      │  ├─ sidebar.tsx
      │  ├─ search-bar.tsx
      │  ├─ qr-card.tsx
      │  ├─ url-editor.tsx            # raw URL input + live preview
      │  ├─ url-preview.tsx           # parsed scheme/path/query table
      │  ├─ copy-button.tsx
      │  └─ download-buttons.tsx
      └─ tests/
         ├─ url-parse.test.ts
         └─ qr.test.ts
```

---

## Task 1: Bootstrap monorepo and Next.js app

**Files:**
- Create: `package.json`, `pnpm-workspace.yaml`, `.nvmrc`, `.npmrc`
- Create: `apps/qr-codes/` (via `pnpm create next-app`)

- [ ] **Step 1: Pin node and create root workspace files**

Run from `/Users/shanyulong/riki/repo/guoba-vibe`:

```bash
echo "22" > .nvmrc
```

Create `.npmrc`:
```
auto-install-peers=true
strict-peer-dependencies=false
```

Create `pnpm-workspace.yaml`:
```yaml
packages:
  - "apps/*"
  - "packages/*"
```

Create `package.json`:
```json
{
  "name": "guoba-vibe",
  "private": true,
  "version": "0.0.0",
  "packageManager": "pnpm@9.15.0",
  "scripts": {
    "dev": "pnpm --filter qr-codes dev",
    "build": "pnpm --filter qr-codes build",
    "start": "pnpm --filter qr-codes start",
    "lint": "pnpm --filter qr-codes lint",
    "test": "pnpm --filter qr-codes test"
  },
  "engines": {
    "node": ">=22"
  }
}
```

- [ ] **Step 2: Scaffold Next.js app**

Run:
```bash
mkdir -p apps && cd apps && pnpm create next-app@latest qr-codes --typescript --tailwind --eslint --app --src-dir --turbopack --import-alias "@/*" --use-pnpm
```

When prompted about "Would you like your code inside a `src/` directory?" answer **Yes**. Other defaults: App Router yes, Turbopack yes, alias `@/*`.

This creates `apps/qr-codes/` with Next 15, React 19, Tailwind v4, TS, ESLint.

- [ ] **Step 3: Verify dev server runs**

```bash
cd /Users/shanyulong/riki/repo/guoba-vibe && pnpm dev
```
Expected: server starts on http://localhost:3000 and shows the Next.js starter page. Ctrl-C to stop.

- [ ] **Step 4: Update root `.gitignore`**

Append to `/Users/shanyulong/riki/repo/guoba-vibe/.gitignore`:
```
node_modules/
.next/
.turbo/
.vercel/
.env
.env.local
.env.*.local
*.tsbuildinfo
coverage/
dist/
```

- [ ] **Step 5: Commit**

```bash
cd /Users/shanyulong/riki/repo/guoba-vibe
git add -A
git commit -m "feat: bootstrap pnpm workspace and Next.js app in apps/qr-codes"
```

---

## Task 2: shadcn/ui and Tailwind theme setup

**Files:**
- Create: `apps/qr-codes/components.json`
- Modify: `apps/qr-codes/src/app/globals.css` (shadcn tokens)
- Create: `apps/qr-codes/src/components/ui/*` (button, input, label, dialog, dropdown-menu, card, separator)

- [ ] **Step 1: Init shadcn/ui**

```bash
cd apps/qr-codes
pnpm dlx shadcn@latest init
```

Answer prompts:
- Style: **New York**
- Base color: **Zinc**
- CSS variables: **Yes**

This creates `components.json` and writes Tailwind tokens into `src/app/globals.css`.

- [ ] **Step 2: Install primitive components**

```bash
pnpm dlx shadcn@latest add button input label textarea card dropdown-menu dialog separator badge sonner
```

These land in `src/components/ui/`. Sonner is the toast primitive.

- [ ] **Step 3: Mount Sonner Toaster in root layout**

Edit `apps/qr-codes/src/app/layout.tsx`. Add inside `<body>`, after `{children}`:
```tsx
import { Toaster } from "@/components/ui/sonner";
// ...
<Toaster richColors position="top-right" />
```

- [ ] **Step 4: Sanity-check by rendering a Button on the home page**

Replace `apps/qr-codes/src/app/page.tsx` with:
```tsx
import { Button } from "@/components/ui/button";

export default function HomePage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center gap-4">
      <h1 className="text-2xl font-semibold">QR Codes</h1>
      <Button>Hello shadcn</Button>
    </main>
  );
}
```

Run `pnpm dev`, visit http://localhost:3000, confirm a styled button appears.

- [ ] **Step 5: Commit**

```bash
cd /Users/shanyulong/riki/repo/guoba-vibe
git add -A
git commit -m "feat(qr-codes): install shadcn/ui primitives and Sonner toaster"
```

---

## Task 3: Vitest and env validation

**Files:**
- Create: `apps/qr-codes/vitest.config.ts`
- Create: `apps/qr-codes/src/env.ts`
- Create: `apps/qr-codes/.env.example`
- Modify: `apps/qr-codes/package.json` (add `test` script)

- [ ] **Step 1: Install deps**

```bash
cd apps/qr-codes
pnpm add -D vitest @vitest/ui
pnpm add zod
```

- [ ] **Step 2: Configure vitest**

Create `apps/qr-codes/vitest.config.ts`:
```ts
import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts", "tests/**/*.test.ts"],
  },
  resolve: {
    alias: { "@": path.resolve(__dirname, "src") },
  },
});
```

Add to `apps/qr-codes/package.json` scripts:
```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 3: Write env validation**

Create `apps/qr-codes/src/env.ts`:
```ts
import { z } from "zod";

const schema = z.object({
  DATABASE_URL: z.string().url(),
  BETTER_AUTH_SECRET: z.string().min(32),
  BETTER_AUTH_URL: z.string().url(),
  GITHUB_CLIENT_ID: z.string().min(1),
  GITHUB_CLIENT_SECRET: z.string().min(1),
  ADMIN_GITHUB_ID: z.string().min(1),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
});

export const env = schema.parse(process.env);
export type Env = z.infer<typeof schema>;
```

- [ ] **Step 4: Create `.env.example`**

Create `apps/qr-codes/.env.example`:
```
DATABASE_URL=postgres://user:pass@host/db?sslmode=require
BETTER_AUTH_SECRET=replace-with-32-or-more-random-chars
BETTER_AUTH_URL=http://localhost:3000
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=
# Your numeric GitHub user ID (e.g. 12345678). Find via `curl https://api.github.com/users/<you>`
ADMIN_GITHUB_ID=
```

- [ ] **Step 5: Smoke-test vitest with a trivial file**

Create `apps/qr-codes/tests/smoke.test.ts`:
```ts
import { describe, it, expect } from "vitest";

describe("smoke", () => {
  it("runs", () => {
    expect(1 + 1).toBe(2);
  });
});
```

Run `pnpm test` from `apps/qr-codes`. Expected: 1 test passes.

- [ ] **Step 6: Commit**

```bash
cd /Users/shanyulong/riki/repo/guoba-vibe
git add -A
git commit -m "feat(qr-codes): add vitest config, zod env validation, and .env.example"
```

---

## Task 4: URL parsing utility (TDD)

**Files:**
- Create: `apps/qr-codes/tests/url-parse.test.ts`
- Create: `apps/qr-codes/src/lib/url-parse.ts`

- [ ] **Step 1: Write failing tests**

Create `apps/qr-codes/tests/url-parse.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { parseUrl } from "@/lib/url-parse";

describe("parseUrl", () => {
  it("parses xhsdiscover deep link with query", () => {
    const r = parseUrl("xhsdiscover://rn/wakanda/buyer-conversion?sku_id=1&item_id=2");
    expect(r.isValid).toBe(true);
    expect(r.scheme).toBe("xhsdiscover");
    expect(r.path).toBe("rn/wakanda/buyer-conversion");
    expect(r.query).toEqual({ sku_id: "1", item_id: "2" });
  });

  it("parses https url", () => {
    const r = parseUrl("https://example.com/foo/bar?x=1");
    expect(r.isValid).toBe(true);
    expect(r.scheme).toBe("https");
    expect(r.path).toBe("example.com/foo/bar");
    expect(r.query).toEqual({ x: "1" });
  });

  it("parses url with no query", () => {
    const r = parseUrl("xhsdiscover://rn/wakanda/buyer-conversion");
    expect(r.path).toBe("rn/wakanda/buyer-conversion");
    expect(r.query).toEqual({});
  });

  it("parses url with empty query value", () => {
    const r = parseUrl("https://a.com/p?k=");
    expect(r.query).toEqual({ k: "" });
  });

  it("preserves repeated query keys by last-write", () => {
    const r = parseUrl("https://a.com/?k=1&k=2");
    expect(r.query).toEqual({ k: "2" });
  });

  it("returns isValid=false for garbage", () => {
    const r = parseUrl("not a url");
    expect(r.isValid).toBe(false);
  });

  it("returns isValid=false for empty string", () => {
    expect(parseUrl("").isValid).toBe(false);
  });

  it("trims surrounding whitespace", () => {
    const r = parseUrl("  https://a.com/p  ");
    expect(r.isValid).toBe(true);
    expect(r.path).toBe("a.com/p");
  });
});
```

- [ ] **Step 2: Run tests, expect failures**

```bash
cd apps/qr-codes
pnpm test url-parse
```
Expected: all 8 tests fail because `@/lib/url-parse` does not exist.

- [ ] **Step 3: Implement `parseUrl`**

Create `apps/qr-codes/src/lib/url-parse.ts`:
```ts
export type ParsedUrl = {
  raw: string;
  scheme: string;
  path: string;
  query: Record<string, string>;
  isValid: boolean;
};

const SEP = "://";

export function parseUrl(input: string): ParsedUrl {
  const raw = input.trim();
  const empty: ParsedUrl = { raw, scheme: "", path: "", query: {}, isValid: false };
  if (!raw) return empty;

  let u: URL;
  try {
    u = new URL(raw);
  } catch {
    return empty;
  }

  const scheme = u.protocol.replace(/:$/, "");
  if (!scheme) return empty;

  const queryStart = raw.indexOf("?");
  const beforeQuery = queryStart === -1 ? raw : raw.slice(0, queryStart);
  const sepIndex = beforeQuery.indexOf(SEP);
  const path =
    sepIndex === -1
      ? beforeQuery.slice(scheme.length + 1) // scheme:path (rare)
      : beforeQuery.slice(sepIndex + SEP.length);

  const query: Record<string, string> = {};
  u.searchParams.forEach((value, key) => {
    query[key] = value;
  });

  return { raw, scheme, path, query, isValid: true };
}
```

- [ ] **Step 4: Run tests, expect pass**

```bash
pnpm test url-parse
```
Expected: all 8 tests pass.

- [ ] **Step 5: Commit**

```bash
cd /Users/shanyulong/riki/repo/guoba-vibe
git add -A
git commit -m "feat(qr-codes): parseUrl utility for custom-scheme and http(s) URLs"
```

---

## Task 5: QR rendering utility (TDD)

**Files:**
- Create: `apps/qr-codes/tests/qr.test.ts`
- Create: `apps/qr-codes/src/lib/qr.ts`

- [ ] **Step 1: Install deps**

```bash
cd apps/qr-codes
pnpm add qrcode
pnpm add -D @types/qrcode
```

- [ ] **Step 2: Write failing tests**

Create `apps/qr-codes/tests/qr.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { renderSvg, renderPng } from "@/lib/qr";

describe("renderSvg", () => {
  it("returns an SVG string for a custom-scheme URL", async () => {
    const svg = await renderSvg("xhsdiscover://rn/wakanda/buyer-conversion?sku_id=1");
    expect(svg.startsWith("<?xml")).toBe(true);
    expect(svg).toContain("<svg");
    expect(svg).toContain("</svg>");
  });

  it("respects margin and width options", async () => {
    const small = await renderSvg("https://a.com", { width: 128 });
    const large = await renderSvg("https://a.com", { width: 512 });
    expect(small).toContain('width="128"');
    expect(large).toContain('width="512"');
  });

  it("throws for empty input", async () => {
    await expect(renderSvg("")).rejects.toThrow();
  });
});

describe("renderPng", () => {
  it("returns a PNG buffer with correct magic bytes", async () => {
    const buf = await renderPng("https://a.com", { width: 256 });
    expect(buf.length).toBeGreaterThan(100);
    // PNG magic: 89 50 4E 47 0D 0A 1A 0A
    expect(buf[0]).toBe(0x89);
    expect(buf[1]).toBe(0x50);
    expect(buf[2]).toBe(0x4e);
    expect(buf[3]).toBe(0x47);
  });
});
```

- [ ] **Step 3: Run tests, expect failures**

```bash
pnpm test qr
```
Expected: all 4 tests fail because `@/lib/qr` does not exist.

- [ ] **Step 4: Implement**

Create `apps/qr-codes/src/lib/qr.ts`:
```ts
import QRCode from "qrcode";

export type QrOptions = {
  width?: number;
  margin?: number;
};

const DEFAULTS: Required<QrOptions> = { width: 512, margin: 2 };

export async function renderSvg(data: string, opts: QrOptions = {}): Promise<string> {
  if (!data) throw new Error("renderSvg: data is required");
  const { width, margin } = { ...DEFAULTS, ...opts };
  return QRCode.toString(data, {
    type: "svg",
    width,
    margin,
    errorCorrectionLevel: "M",
  });
}

export async function renderPng(data: string, opts: QrOptions = {}): Promise<Buffer> {
  if (!data) throw new Error("renderPng: data is required");
  const { width, margin } = { ...DEFAULTS, ...opts };
  return QRCode.toBuffer(data, {
    type: "png",
    width,
    margin,
    errorCorrectionLevel: "M",
  });
}
```

- [ ] **Step 5: Run tests, expect pass**

```bash
pnpm test qr
```
Expected: all 4 tests pass.

- [ ] **Step 6: Commit**

```bash
cd /Users/shanyulong/riki/repo/guoba-vibe
git add -A
git commit -m "feat(qr-codes): renderSvg/renderPng wrappers around qrcode"
```

---

## Task 6: Drizzle setup and schema

**Files:**
- Create: `apps/qr-codes/drizzle.config.ts`
- Create: `apps/qr-codes/src/db/client.ts`
- Create: `apps/qr-codes/src/db/schema.ts`
- Create: `apps/qr-codes/src/lib/nanoid.ts`
- Create: `apps/qr-codes/drizzle/0000_init.sql` (generated)

- [ ] **Step 1: Install deps**

```bash
cd apps/qr-codes
pnpm add drizzle-orm postgres nanoid
pnpm add -D drizzle-kit
```

- [ ] **Step 2: Create nanoid helper**

Create `apps/qr-codes/src/lib/nanoid.ts`:
```ts
import { customAlphabet } from "nanoid";

// URL-safe, no look-alikes
const alphabet = "23456789abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ";

export const nanoid8 = customAlphabet(alphabet, 8);
```

- [ ] **Step 3: Define schema**

Create `apps/qr-codes/src/db/schema.ts`:
```ts
import { pgTable, text, timestamp, primaryKey, boolean } from "drizzle-orm/pg-core";
import { nanoid8 } from "@/lib/nanoid";

// ---- Domain ----
export const collections = pgTable("collections", {
  id: text("id").primaryKey().$defaultFn(() => nanoid8()),
  title: text("title").notNull(),
  description: text("description"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const qrs = pgTable("qrs", {
  id: text("id").primaryKey().$defaultFn(() => nanoid8()),
  title: text("title").notNull(),
  description: text("description"),
  url: text("url").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const qrCollections = pgTable(
  "qr_collections",
  {
    qrId: text("qr_id")
      .notNull()
      .references(() => qrs.id, { onDelete: "cascade" }),
    collectionId: text("collection_id")
      .notNull()
      .references(() => collections.id, { onDelete: "cascade" }),
  },
  (t) => ({ pk: primaryKey({ columns: [t.qrId, t.collectionId] }) })
);

// ---- better-auth (mirrors better-auth default schema; will be regenerated by CLI in Task 8) ----
export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  image: text("image"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const session = pgTable("session", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  token: text("token").notNull().unique(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const account = pgTable("account", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  accessTokenExpiresAt: timestamp("access_token_expires_at", { withTimezone: true }),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at", { withTimezone: true }),
  scope: text("scope"),
  idToken: text("id_token"),
  password: text("password"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const verification = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
```

- [ ] **Step 4: Create DB client**

Create `apps/qr-codes/src/db/client.ts`:
```ts
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { env } from "@/env";
import * as schema from "@/db/schema";

const client = postgres(env.DATABASE_URL, { prepare: false });
export const db = drizzle(client, { schema });
```

- [ ] **Step 5: Configure drizzle-kit**

Create `apps/qr-codes/drizzle.config.ts`:
```ts
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: { url: process.env.DATABASE_URL! },
  strict: true,
  verbose: true,
});
```

Add to `apps/qr-codes/package.json` scripts:
```json
"db:generate": "drizzle-kit generate",
"db:push": "drizzle-kit push",
"db:studio": "drizzle-kit studio"
```

- [ ] **Step 6: Provision Neon DB and fill .env.local**

Tell the user (in the task completion message) to:
1. Create a Postgres database in Vercel dashboard (Storage → Create → Neon).
2. Copy the `DATABASE_URL` into `apps/qr-codes/.env.local`.
3. Generate a 32+ char secret: `openssl rand -base64 32` → `BETTER_AUTH_SECRET`.
4. Set `BETTER_AUTH_URL=http://localhost:3000`.

Do not proceed past this step until the user confirms `.env.local` is filled.

- [ ] **Step 7: Generate and push migration**

```bash
cd apps/qr-codes
pnpm db:generate
pnpm db:push
```

Expected: `drizzle/0000_<name>.sql` is created, and `pnpm db:push` reports the tables created in Neon.

- [ ] **Step 8: Commit**

```bash
cd /Users/shanyulong/riki/repo/guoba-vibe
git add -A
git commit -m "feat(qr-codes): drizzle schema for collections, qrs, qr_collections, and auth tables"
```

---

## Task 7: better-auth instance and GitHub provider

**Files:**
- Create: `apps/qr-codes/src/auth/server.ts`
- Create: `apps/qr-codes/src/auth/client.ts`
- Create: `apps/qr-codes/src/auth/admin.ts`
- Create: `apps/qr-codes/src/app/api/auth/[...all]/route.ts`

- [ ] **Step 1: Install deps**

```bash
cd apps/qr-codes
pnpm add better-auth
```

- [ ] **Step 2: Configure better-auth server instance**

Create `apps/qr-codes/src/auth/server.ts`:
```ts
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "@/db/client";
import * as schema from "@/db/schema";
import { env } from "@/env";

export const auth = betterAuth({
  secret: env.BETTER_AUTH_SECRET,
  baseURL: env.BETTER_AUTH_URL,
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: {
      user: schema.user,
      session: schema.session,
      account: schema.account,
      verification: schema.verification,
    },
  }),
  socialProviders: {
    github: {
      clientId: env.GITHUB_CLIENT_ID,
      clientSecret: env.GITHUB_CLIENT_SECRET,
      // Map provider account id (numeric GitHub user id) into account.accountId
    },
  },
  session: {
    expiresIn: 60 * 60 * 24 * 30, // 30 days
    cookieCache: { enabled: true, maxAge: 60 * 5 },
  },
});

export type Session = typeof auth.$Infer.Session;
```

- [ ] **Step 3: Mount API handler**

Create `apps/qr-codes/src/app/api/auth/[...all]/route.ts`:
```ts
import { auth } from "@/auth/server";
import { toNextJsHandler } from "better-auth/next-js";

export const { GET, POST } = toNextJsHandler(auth);
```

- [ ] **Step 4: Client helpers**

Create `apps/qr-codes/src/auth/client.ts`:
```ts
"use client";
import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient({
  baseURL: typeof window === "undefined" ? undefined : window.location.origin,
});

export const { signIn, signOut, useSession } = authClient;
```

- [ ] **Step 5: Admin gate helper**

Create `apps/qr-codes/src/auth/admin.ts`:
```ts
import "server-only";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { eq, and } from "drizzle-orm";
import { auth } from "@/auth/server";
import { db } from "@/db/client";
import * as schema from "@/db/schema";
import { env } from "@/env";

export async function getAdminSession() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return null;

  // Look up the github account row to read the provider-side account id
  const rows = await db
    .select({ accountId: schema.account.accountId })
    .from(schema.account)
    .where(
      and(eq(schema.account.userId, session.user.id), eq(schema.account.providerId, "github"))
    )
    .limit(1);

  const githubId = rows[0]?.accountId;
  if (!githubId || githubId !== env.ADMIN_GITHUB_ID) return null;
  return session;
}

export async function requireAdmin() {
  const session = await getAdminSession();
  if (!session) redirect("/login");
  return session;
}
```

- [ ] **Step 6: GitHub OAuth app + env**

Tell the user to:
1. Visit https://github.com/settings/developers → "New OAuth App".
2. Homepage URL: `http://localhost:3000`. Callback URL: `http://localhost:3000/api/auth/callback/github`.
3. Copy `Client ID` → `GITHUB_CLIENT_ID`, generate `Client Secret` → `GITHUB_CLIENT_SECRET`.
4. Find your numeric GitHub ID: `curl https://api.github.com/users/<your-login>` → copy the `id` field → `ADMIN_GITHUB_ID`.

Confirm `.env.local` is filled before continuing.

- [ ] **Step 7: Manual verification**

Start `pnpm dev`, hit `http://localhost:3000/api/auth/sign-in/github`. Expected: redirect to GitHub OAuth consent. Approve, get redirected back. Then visit `http://localhost:3000/api/auth/session` and expect JSON with your user data.

- [ ] **Step 8: Commit**

```bash
cd /Users/shanyulong/riki/repo/guoba-vibe
git add -A
git commit -m "feat(qr-codes): better-auth with GitHub OAuth and admin gate"
```

---

## Task 8: Middleware route gate

**Files:**
- Create: `apps/qr-codes/src/middleware.ts`

- [ ] **Step 1: Create middleware**

Create `apps/qr-codes/src/middleware.ts`:
```ts
import { NextResponse, type NextRequest } from "next/server";
import { getSessionCookie } from "better-auth/cookies";

export function middleware(req: NextRequest) {
  const sessionCookie = getSessionCookie(req);
  if (!sessionCookie) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};
```

Note: middleware only checks cookie presence (a fast optimistic gate). The real admin check (`ADMIN_GITHUB_ID`) happens in `requireAdmin()` inside the page/layout. This pattern is from better-auth's Next.js docs.

- [ ] **Step 2: Verify**

Visit `http://localhost:3000/admin` while signed out. Expected: redirect to `/login`.

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat(qr-codes): middleware redirects unauthenticated /admin/** to /login"
```

---

## Task 9: Login page and root page

**Files:**
- Modify: `apps/qr-codes/src/app/page.tsx`
- Create: `apps/qr-codes/src/app/login/page.tsx`

- [ ] **Step 1: Root page**

Replace `apps/qr-codes/src/app/page.tsx`:
```tsx
import Link from "next/link";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { getAdminSession } from "@/auth/admin";

export default async function HomePage() {
  const session = await getAdminSession();
  if (session) redirect("/admin");

  return (
    <main className="min-h-screen flex flex-col items-center justify-center gap-6 px-6 text-center">
      <h1 className="text-3xl font-semibold">QR Codes</h1>
      <p className="text-muted-foreground max-w-md">
        Personal vault for mobile-app deep-link QR codes. Sign in to manage; share /q/&lt;id&gt; links to anyone with a phone.
      </p>
      <Button asChild>
        <Link href="/login">Sign in with GitHub</Link>
      </Button>
    </main>
  );
}
```

- [ ] **Step 2: Login page**

Create `apps/qr-codes/src/app/login/page.tsx`:
```tsx
"use client";

import { Button } from "@/components/ui/button";
import { signIn } from "@/auth/client";

export default function LoginPage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center gap-6 px-6">
      <h1 className="text-2xl font-semibold">Sign in</h1>
      <Button
        onClick={() => signIn.social({ provider: "github", callbackURL: "/admin" })}
      >
        Continue with GitHub
      </Button>
    </main>
  );
}
```

- [ ] **Step 3: Verify**

Visit `/`, sign out via dev tools (clear cookies), reload. Expect to see the landing. Click "Sign in with GitHub", land on `/login`, click the GitHub button, complete OAuth, end up at `/admin` (which will 404 for now — fixed in Task 12).

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat(qr-codes): root landing and GitHub login pages"
```

---

## Task 10: Collection server actions

**Files:**
- Create: `apps/qr-codes/src/server/collections.ts`

- [ ] **Step 1: Implement**

Create `apps/qr-codes/src/server/collections.ts`:
```ts
"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db/client";
import { collections } from "@/db/schema";
import { requireAdmin } from "@/auth/admin";

const inputSchema = z.object({
  title: z.string().min(1, "title is required").max(200),
  description: z.string().max(2000).optional().nullable(),
});

export async function createCollection(input: z.infer<typeof inputSchema>) {
  await requireAdmin();
  const data = inputSchema.parse(input);
  const [row] = await db
    .insert(collections)
    .values({ title: data.title, description: data.description ?? null })
    .returning({ id: collections.id });
  revalidatePath("/admin");
  redirect(`/admin?c=${row.id}`);
}

export async function updateCollection(id: string, input: z.infer<typeof inputSchema>) {
  await requireAdmin();
  const data = inputSchema.parse(input);
  await db
    .update(collections)
    .set({
      title: data.title,
      description: data.description ?? null,
      updatedAt: new Date(),
    })
    .where(eq(collections.id, id));
  revalidatePath("/admin");
  revalidatePath(`/c/${id}`);
  redirect(`/admin?c=${id}`);
}

export async function deleteCollection(id: string) {
  await requireAdmin();
  await db.delete(collections).where(eq(collections.id, id));
  revalidatePath("/admin");
  redirect("/admin");
}
```

- [ ] **Step 2: Commit**

```bash
git add -A
git commit -m "feat(qr-codes): server actions for collection CRUD"
```

---

## Task 11: QR server actions (with ≥1 collection rule)

**Files:**
- Create: `apps/qr-codes/src/server/qrs.ts`

- [ ] **Step 1: Implement**

Create `apps/qr-codes/src/server/qrs.ts`:
```ts
"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db/client";
import { qrs, qrCollections } from "@/db/schema";
import { requireAdmin } from "@/auth/admin";
import { parseUrl } from "@/lib/url-parse";

const inputSchema = z.object({
  title: z.string().min(1, "title is required").max(200),
  description: z.string().max(2000).optional().nullable(),
  url: z
    .string()
    .min(1, "url is required")
    .refine((v) => parseUrl(v).isValid, { message: "not a valid URL" }),
  collectionIds: z.array(z.string().min(1)).min(1, "select at least one collection"),
});

export async function createQr(input: z.infer<typeof inputSchema>) {
  await requireAdmin();
  const data = inputSchema.parse(input);

  const id = await db.transaction(async (tx) => {
    const [row] = await tx
      .insert(qrs)
      .values({
        title: data.title,
        description: data.description ?? null,
        url: data.url,
      })
      .returning({ id: qrs.id });

    await tx
      .insert(qrCollections)
      .values(data.collectionIds.map((cid) => ({ qrId: row.id, collectionId: cid })));

    return row.id;
  });

  revalidatePath("/admin");
  for (const cid of data.collectionIds) revalidatePath(`/c/${cid}`);
  redirect(`/q/${id}`);
}

export async function updateQr(id: string, input: z.infer<typeof inputSchema>) {
  await requireAdmin();
  const data = inputSchema.parse(input);

  await db.transaction(async (tx) => {
    await tx
      .update(qrs)
      .set({
        title: data.title,
        description: data.description ?? null,
        url: data.url,
        updatedAt: new Date(),
      })
      .where(eq(qrs.id, id));

    await tx.delete(qrCollections).where(eq(qrCollections.qrId, id));
    await tx
      .insert(qrCollections)
      .values(data.collectionIds.map((cid) => ({ qrId: id, collectionId: cid })));
  });

  revalidatePath("/admin");
  revalidatePath(`/q/${id}`);
  for (const cid of data.collectionIds) revalidatePath(`/c/${cid}`);
  redirect(`/q/${id}`);
}

export async function deleteQr(id: string) {
  await requireAdmin();
  await db.delete(qrs).where(eq(qrs.id, id));
  revalidatePath("/admin");
  redirect("/admin");
}
```

- [ ] **Step 2: Commit**

```bash
git add -A
git commit -m "feat(qr-codes): server actions for QR CRUD with ≥1-collection validation"
```

---

## Task 12: URL editor and URL preview components

**Files:**
- Create: `apps/qr-codes/src/components/url-preview.tsx`
- Create: `apps/qr-codes/src/components/url-editor.tsx`

- [ ] **Step 1: URL preview (server-renderable)**

Create `apps/qr-codes/src/components/url-preview.tsx`:
```tsx
import { parseUrl } from "@/lib/url-parse";

export function UrlPreview({ url }: { url: string }) {
  const parsed = parseUrl(url);
  if (!parsed.isValid) {
    return <p className="text-sm text-red-500">Invalid URL</p>;
  }
  const queryEntries = Object.entries(parsed.query);
  return (
    <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
      <dt className="text-muted-foreground">scheme</dt>
      <dd className="font-mono break-all">{parsed.scheme}</dd>
      <dt className="text-muted-foreground">path</dt>
      <dd className="font-mono break-all">{parsed.path}</dd>
      <dt className="text-muted-foreground">query</dt>
      <dd>
        {queryEntries.length === 0 ? (
          <span className="text-muted-foreground italic">(none)</span>
        ) : (
          <ul className="space-y-1">
            {queryEntries.map(([k, v]) => (
              <li key={k} className="font-mono">
                <span className="text-muted-foreground">{k}</span>={v}
              </li>
            ))}
          </ul>
        )}
      </dd>
    </dl>
  );
}
```

- [ ] **Step 2: URL editor (client component)**

Create `apps/qr-codes/src/components/url-editor.tsx`:
```tsx
"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { UrlPreview } from "@/components/url-preview";

export function UrlEditor({
  name = "url",
  defaultValue = "",
  required = true,
}: {
  name?: string;
  defaultValue?: string;
  required?: boolean;
}) {
  const [value, setValue] = useState(defaultValue);
  return (
    <div className="space-y-2">
      <Label htmlFor={name}>URL</Label>
      <Input
        id={name}
        name={name}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="xhsdiscover://rn/wakanda/buyer-conversion?sku_id=1"
        required={required}
        className="font-mono"
      />
      <div className="rounded-md border bg-muted/30 p-3">
        {value ? (
          <UrlPreview url={value} />
        ) : (
          <p className="text-sm text-muted-foreground italic">Paste a URL to preview…</p>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat(qr-codes): URL editor with live parse preview"
```

---

## Task 13: Admin layout, sidebar, and home grid

**Files:**
- Create: `apps/qr-codes/src/app/(admin)/layout.tsx`
- Create: `apps/qr-codes/src/app/(admin)/admin/page.tsx`
- Create: `apps/qr-codes/src/components/sidebar.tsx`
- Create: `apps/qr-codes/src/components/search-bar.tsx`
- Create: `apps/qr-codes/src/components/qr-card.tsx`

- [ ] **Step 1: Sidebar component (client, reads ?c= for active state)**

Create `apps/qr-codes/src/components/sidebar.tsx`:
```tsx
"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

type Item = { id: string; title: string };

export function Sidebar({ collections }: { collections: Item[] }) {
  const params = useSearchParams();
  const active = params.get("c") ?? undefined;
  return (
    <aside className="w-64 border-r flex flex-col p-4 gap-2">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-medium text-muted-foreground">Collections</h2>
        <Button asChild size="sm" variant="ghost">
          <Link href="/admin/collections/new">+ New</Link>
        </Button>
      </div>
      <Separator />
      <nav className="flex flex-col gap-1">
        <Link
          href="/admin"
          className={`rounded px-2 py-1.5 text-sm hover:bg-muted ${
            !active ? "bg-muted font-medium" : ""
          }`}
        >
          All QRs
        </Link>
        {collections.map((c) => (
          <Link
            key={c.id}
            href={`/admin?c=${c.id}`}
            className={`rounded px-2 py-1.5 text-sm hover:bg-muted truncate ${
              active === c.id ? "bg-muted font-medium" : ""
            }`}
          >
            {c.title}
          </Link>
        ))}
      </nav>
      <div className="mt-auto">
        <Button asChild className="w-full">
          <Link href="/admin/qrs/new">+ New QR</Link>
        </Button>
      </div>
    </aside>
  );
}
```

- [ ] **Step 2: Search bar (client component)**

Create `apps/qr-codes/src/components/search-bar.tsx`:
```tsx
"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Input } from "@/components/ui/input";
import { useEffect, useState } from "react";

export function SearchBar() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [value, setValue] = useState(params.get("q") ?? "");

  useEffect(() => {
    const t = setTimeout(() => {
      const next = new URLSearchParams(params.toString());
      if (value) next.set("q", value);
      else next.delete("q");
      router.replace(`${pathname}?${next.toString()}`);
    }, 250);
    return () => clearTimeout(t);
  }, [value, router, pathname, params]);

  return (
    <Input
      placeholder="Search title, url, description…"
      value={value}
      onChange={(e) => setValue(e.target.value)}
      className="max-w-md"
    />
  );
}
```

- [ ] **Step 3: QR card**

Create `apps/qr-codes/src/components/qr-card.tsx`:
```tsx
import Link from "next/link";
import { renderSvg } from "@/lib/qr";

export async function QrCard({
  id,
  title,
  url,
}: {
  id: string;
  title: string;
  url: string;
}) {
  const svg = await renderSvg(url, { width: 256, margin: 1 });
  return (
    <Link
      href={`/q/${id}`}
      className="block rounded-lg border p-4 hover:shadow-md transition"
    >
      <div
        className="aspect-square w-full max-w-[180px] mx-auto"
        dangerouslySetInnerHTML={{ __html: svg }}
      />
      <h3 className="mt-3 font-medium truncate">{title}</h3>
      <p className="mt-1 text-xs text-muted-foreground font-mono truncate">{url}</p>
    </Link>
  );
}
```

- [ ] **Step 4: Admin layout (with auth + sidebar)**

Create `apps/qr-codes/src/app/(admin)/layout.tsx`:
```tsx
import { asc } from "drizzle-orm";
import { requireAdmin } from "@/auth/admin";
import { db } from "@/db/client";
import { collections } from "@/db/schema";
import { Sidebar } from "@/components/sidebar";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireAdmin();
  const cols = await db
    .select({ id: collections.id, title: collections.title })
    .from(collections)
    .orderBy(asc(collections.title));

  return (
    <div className="min-h-screen flex">
      <Sidebar collections={cols} />
      <main className="flex-1 p-6 overflow-x-hidden">{children}</main>
    </div>
  );
}
```

- [ ] **Step 5: Admin home page**

Create `apps/qr-codes/src/app/(admin)/admin/page.tsx`:
```tsx
import { and, desc, eq, ilike, or, inArray } from "drizzle-orm";
import { db } from "@/db/client";
import { qrs, qrCollections, collections } from "@/db/schema";
import { SearchBar } from "@/components/search-bar";
import { QrCard } from "@/components/qr-card";

type SearchParams = Promise<{ c?: string; q?: string }>;

export default async function AdminHome({ searchParams }: { searchParams: SearchParams }) {
  const { c, q } = await searchParams;

  // Build filter
  const filters = [];
  if (q) {
    const needle = `%${q}%`;
    filters.push(
      or(
        ilike(qrs.title, needle),
        ilike(qrs.url, needle),
        ilike(qrs.description, needle)
      )!
    );
  }
  if (c) {
    const inCollection = db
      .select({ id: qrCollections.qrId })
      .from(qrCollections)
      .where(eq(qrCollections.collectionId, c));
    filters.push(inArray(qrs.id, inCollection));
  }

  const rows = await db
    .select({ id: qrs.id, title: qrs.title, url: qrs.url })
    .from(qrs)
    .where(filters.length ? and(...filters) : undefined)
    .orderBy(desc(qrs.createdAt));

  const collection = c
    ? await db.query.collections.findFirst({ where: eq(collections.id, c) })
    : null;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <h1 className="text-xl font-semibold">
          {collection ? collection.title : "All QRs"}
          <span className="ml-2 text-muted-foreground text-sm">({rows.length})</span>
        </h1>
        <SearchBar />
      </div>
      {rows.length === 0 ? (
        <p className="text-muted-foreground">No QRs match.</p>
      ) : (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-4">
          {rows.map((r) => (
            <QrCard key={r.id} id={r.id} title={r.title} url={r.url} />
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 6: Verify**

Visit `/admin`. Expected: sidebar with "All QRs" + "+ New" + "+ New QR" buttons, empty grid with "No QRs match.".

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat(qr-codes): admin layout with sidebar, search, and QR grid"
```

---

## Task 14: Admin collection new/edit pages

**Files:**
- Create: `apps/qr-codes/src/app/(admin)/admin/collections/new/page.tsx`
- Create: `apps/qr-codes/src/app/(admin)/admin/collections/[id]/edit/page.tsx`
- Create: `apps/qr-codes/src/components/collection-form.tsx`

- [ ] **Step 1: Shared form component**

Create `apps/qr-codes/src/components/collection-form.tsx`:
```tsx
"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export type CollectionInput = { title: string; description: string | null };

export function CollectionForm({
  initial,
  onSubmit,
  submitLabel,
}: {
  initial?: CollectionInput;
  onSubmit: (input: CollectionInput) => Promise<void>;
  submitLabel: string;
}) {
  const [pending, start] = useTransition();
  return (
    <form
      className="max-w-xl space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        const title = String(fd.get("title") ?? "").trim();
        const description = String(fd.get("description") ?? "").trim() || null;
        if (!title) {
          toast.error("Title is required");
          return;
        }
        start(async () => {
          try {
            await onSubmit({ title, description });
          } catch (err) {
            toast.error(err instanceof Error ? err.message : "Failed");
          }
        });
      }}
    >
      <div>
        <Label htmlFor="title">Title</Label>
        <Input id="title" name="title" defaultValue={initial?.title} required />
      </div>
      <div>
        <Label htmlFor="description">Description</Label>
        <Textarea id="description" name="description" defaultValue={initial?.description ?? ""} rows={3} />
      </div>
      <Button type="submit" disabled={pending}>
        {pending ? "Saving…" : submitLabel}
      </Button>
    </form>
  );
}
```

- [ ] **Step 2: New page**

Create `apps/qr-codes/src/app/(admin)/admin/collections/new/page.tsx`:
```tsx
import { CollectionForm } from "@/components/collection-form";
import { createCollection } from "@/server/collections";

export default function NewCollectionPage() {
  async function handle(input: { title: string; description: string | null }) {
    "use server";
    await createCollection(input);
  }
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">New Collection</h1>
      <CollectionForm onSubmit={handle} submitLabel="Create" />
    </div>
  );
}
```

- [ ] **Step 3: Edit page**

Create `apps/qr-codes/src/app/(admin)/admin/collections/[id]/edit/page.tsx`:
```tsx
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { db } from "@/db/client";
import { collections } from "@/db/schema";
import { CollectionForm } from "@/components/collection-form";
import { updateCollection, deleteCollection } from "@/server/collections";
import { Button } from "@/components/ui/button";

export default async function EditCollectionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const row = await db.query.collections.findFirst({ where: eq(collections.id, id) });
  if (!row) notFound();

  async function update(input: { title: string; description: string | null }) {
    "use server";
    await updateCollection(id, input);
  }
  async function remove() {
    "use server";
    await deleteCollection(id);
  }

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Edit Collection</h1>
      <CollectionForm
        initial={{ title: row.title, description: row.description }}
        onSubmit={update}
        submitLabel="Save"
      />
      <form action={remove}>
        <Button type="submit" variant="destructive">
          Delete collection
        </Button>
      </form>
    </div>
  );
}
```

- [ ] **Step 4: Verify**

Create a couple of collections via `/admin/collections/new`. Confirm they appear in the sidebar. Edit one, save, see the title update.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(qr-codes): admin pages for creating, editing, deleting collections"
```

---

## Task 15: Admin QR new/edit pages

**Files:**
- Create: `apps/qr-codes/src/app/(admin)/admin/qrs/new/page.tsx`
- Create: `apps/qr-codes/src/app/(admin)/admin/qrs/[id]/edit/page.tsx`
- Create: `apps/qr-codes/src/components/qr-form.tsx`

- [ ] **Step 1: QR form (client)**

Create `apps/qr-codes/src/components/qr-form.tsx`:
```tsx
"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { UrlEditor } from "@/components/url-editor";

export type QrInput = {
  title: string;
  description: string | null;
  url: string;
  collectionIds: string[];
};

export function QrForm({
  collections,
  initial,
  onSubmit,
  submitLabel,
}: {
  collections: { id: string; title: string }[];
  initial?: { title: string; description: string | null; url: string; collectionIds: string[] };
  onSubmit: (input: QrInput) => Promise<void>;
  submitLabel: string;
}) {
  const [pending, start] = useTransition();
  const [selected, setSelected] = useState<Set<string>>(
    new Set(initial?.collectionIds ?? [])
  );

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <form
      className="max-w-2xl space-y-5"
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        const title = String(fd.get("title") ?? "").trim();
        const description = String(fd.get("description") ?? "").trim() || null;
        const url = String(fd.get("url") ?? "").trim();
        const collectionIds = Array.from(selected);

        if (!title) return toast.error("Title is required");
        if (!url) return toast.error("URL is required");
        if (collectionIds.length === 0)
          return toast.error("Select at least one collection");

        start(async () => {
          try {
            await onSubmit({ title, description, url, collectionIds });
          } catch (err) {
            toast.error(err instanceof Error ? err.message : "Failed");
          }
        });
      }}
    >
      <div>
        <Label htmlFor="title">Title</Label>
        <Input id="title" name="title" defaultValue={initial?.title} required />
      </div>
      <div>
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          name="description"
          defaultValue={initial?.description ?? ""}
          rows={3}
        />
      </div>
      <UrlEditor name="url" defaultValue={initial?.url ?? ""} />
      <div>
        <Label>Collections</Label>
        {collections.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No collections yet — create one first in the sidebar.
          </p>
        ) : (
          <div className="flex flex-wrap gap-2 mt-2">
            {collections.map((c) => {
              const active = selected.has(c.id);
              return (
                <button
                  type="button"
                  key={c.id}
                  onClick={() => toggle(c.id)}
                  className={`rounded-full px-3 py-1 text-sm border ${
                    active
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-background hover:bg-muted"
                  }`}
                >
                  {c.title}
                </button>
              );
            })}
          </div>
        )}
      </div>
      <Button type="submit" disabled={pending}>
        {pending ? "Saving…" : submitLabel}
      </Button>
    </form>
  );
}
```

- [ ] **Step 2: New page**

Create `apps/qr-codes/src/app/(admin)/admin/qrs/new/page.tsx`:
```tsx
import { asc } from "drizzle-orm";
import { db } from "@/db/client";
import { collections } from "@/db/schema";
import { QrForm } from "@/components/qr-form";
import { createQr } from "@/server/qrs";

export default async function NewQrPage({
  searchParams,
}: {
  searchParams: Promise<{ c?: string }>;
}) {
  const { c } = await searchParams;
  const cols = await db
    .select({ id: collections.id, title: collections.title })
    .from(collections)
    .orderBy(asc(collections.title));

  async function handle(input: {
    title: string;
    description: string | null;
    url: string;
    collectionIds: string[];
  }) {
    "use server";
    await createQr(input);
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">New QR</h1>
      <QrForm
        collections={cols}
        initial={c ? { title: "", description: null, url: "", collectionIds: [c] } : undefined}
        onSubmit={handle}
        submitLabel="Create"
      />
    </div>
  );
}
```

- [ ] **Step 3: Edit page**

Create `apps/qr-codes/src/app/(admin)/admin/qrs/[id]/edit/page.tsx`:
```tsx
import { asc, eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { db } from "@/db/client";
import { qrs, qrCollections, collections } from "@/db/schema";
import { QrForm } from "@/components/qr-form";
import { updateQr, deleteQr } from "@/server/qrs";
import { Button } from "@/components/ui/button";

export default async function EditQrPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const row = await db.query.qrs.findFirst({ where: eq(qrs.id, id) });
  if (!row) notFound();

  const links = await db
    .select({ collectionId: qrCollections.collectionId })
    .from(qrCollections)
    .where(eq(qrCollections.qrId, id));

  const cols = await db
    .select({ id: collections.id, title: collections.title })
    .from(collections)
    .orderBy(asc(collections.title));

  async function update(input: {
    title: string;
    description: string | null;
    url: string;
    collectionIds: string[];
  }) {
    "use server";
    await updateQr(id, input);
  }
  async function remove() {
    "use server";
    await deleteQr(id);
  }

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Edit QR</h1>
      <QrForm
        collections={cols}
        initial={{
          title: row.title,
          description: row.description,
          url: row.url,
          collectionIds: links.map((l) => l.collectionId),
        }}
        onSubmit={update}
        submitLabel="Save"
      />
      <form action={remove}>
        <Button type="submit" variant="destructive">
          Delete QR
        </Button>
      </form>
    </div>
  );
}
```

- [ ] **Step 4: Verify**

Create a QR via `/admin/qrs/new` with a `xhsdiscover://...` URL, attach to a collection, submit. You should land on `/q/<id>` (which still 404s — fixed in Task 16). Go back to `/admin`, see the new card.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(qr-codes): admin pages for creating, editing, deleting QRs"
```

---

## Task 16: Public QR detail page

**Files:**
- Create: `apps/qr-codes/src/app/q/[id]/page.tsx`
- Create: `apps/qr-codes/src/components/copy-button.tsx`
- Create: `apps/qr-codes/src/components/download-buttons.tsx`

- [ ] **Step 1: Copy button (client)**

Create `apps/qr-codes/src/components/copy-button.tsx`:
```tsx
"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export function CopyButton({ value, label }: { value: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <Button
      variant="outline"
      size="sm"
      onClick={async () => {
        await navigator.clipboard.writeText(value);
        setCopied(true);
        toast.success("Copied");
        setTimeout(() => setCopied(false), 1500);
      }}
    >
      {copied ? "Copied" : label ?? "Copy"}
    </Button>
  );
}
```

- [ ] **Step 2: Download buttons**

Create `apps/qr-codes/src/components/download-buttons.tsx`:
```tsx
import { Button } from "@/components/ui/button";

export function DownloadButtons({ id, title }: { id: string; title: string }) {
  const safe = title.replace(/[^a-z0-9\-_]+/gi, "-").toLowerCase() || id;
  return (
    <div className="flex gap-2">
      <Button asChild variant="outline" size="sm">
        <a href={`/api/qr/${id}?format=png&filename=${safe}.png`} download={`${safe}.png`}>
          Download PNG
        </a>
      </Button>
      <Button asChild variant="outline" size="sm">
        <a href={`/api/qr/${id}?format=svg&filename=${safe}.svg`} download={`${safe}.svg`}>
          Download SVG
        </a>
      </Button>
    </div>
  );
}
```

- [ ] **Step 3: Detail page**

Create `apps/qr-codes/src/app/q/[id]/page.tsx`:
```tsx
import type { Metadata } from "next";
import Link from "next/link";
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { db } from "@/db/client";
import { qrs, qrCollections, collections } from "@/db/schema";
import { renderSvg } from "@/lib/qr";
import { UrlPreview } from "@/components/url-preview";
import { CopyButton } from "@/components/copy-button";
import { DownloadButtons } from "@/components/download-buttons";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const row = await db.query.qrs.findFirst({ where: eq(qrs.id, id) });
  return {
    title: row ? `${row.title} — QR Codes` : "QR Codes",
    description: row?.description ?? row?.url ?? undefined,
    robots: { index: false, follow: false },
  };
}

export default async function QrDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const row = await db.query.qrs.findFirst({ where: eq(qrs.id, id) });
  if (!row) notFound();

  const cols = await db
    .select({ id: collections.id, title: collections.title })
    .from(qrCollections)
    .innerJoin(collections, eq(qrCollections.collectionId, collections.id))
    .where(eq(qrCollections.qrId, id));

  const svg = await renderSvg(row.url, { width: 480, margin: 2 });

  return (
    <main className="mx-auto max-w-2xl px-4 py-10 space-y-8">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold">{row.title}</h1>
        {row.description && <p className="text-muted-foreground">{row.description}</p>}
        {cols.length > 0 && (
          <div className="flex flex-wrap gap-2 text-sm">
            {cols.map((c) => (
              <Link
                key={c.id}
                href={`/c/${c.id}`}
                className="rounded-full bg-muted px-3 py-1 hover:bg-muted-foreground/20"
              >
                {c.title}
              </Link>
            ))}
          </div>
        )}
      </header>

      <div
        className="bg-white p-6 rounded-xl border mx-auto w-fit"
        dangerouslySetInnerHTML={{ __html: svg }}
      />

      <section className="space-y-3">
        <h2 className="text-sm font-medium text-muted-foreground">URL</h2>
        <code className="block break-all rounded-md bg-muted p-3 text-sm">{row.url}</code>
        <div className="flex gap-2 flex-wrap">
          <CopyButton value={row.url} label="Copy URL" />
          <Button asChild size="sm">
            <a href={row.url}>Open link</a>
          </Button>
          <DownloadButtons id={row.id} title={row.title} />
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-medium text-muted-foreground">Parsed</h2>
        <div className="rounded-md border p-4">
          <UrlPreview url={row.url} />
        </div>
      </section>
    </main>
  );
}
```

- [ ] **Step 4: Verify**

Visit `/q/<id>` for the QR you created. Expected: large QR, URL block, Copy/Open/Download buttons, parsed table. Scan with your phone to confirm the QR encodes the correct deep link.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(qr-codes): public QR detail page with QR, parsed URL, copy/open/download"
```

---

## Task 17: Public collection page

**Files:**
- Create: `apps/qr-codes/src/app/c/[id]/page.tsx`

- [ ] **Step 1: Implement**

Create `apps/qr-codes/src/app/c/[id]/page.tsx`:
```tsx
import type { Metadata } from "next";
import { desc, eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { db } from "@/db/client";
import { collections, qrs, qrCollections } from "@/db/schema";
import { QrCard } from "@/components/qr-card";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const row = await db.query.collections.findFirst({ where: eq(collections.id, id) });
  return {
    title: row ? `${row.title} — QR Codes` : "QR Codes",
    description: row?.description ?? undefined,
    robots: { index: false, follow: false },
  };
}

export default async function CollectionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const collection = await db.query.collections.findFirst({
    where: eq(collections.id, id),
  });
  if (!collection) notFound();

  const rows = await db
    .select({ id: qrs.id, title: qrs.title, url: qrs.url })
    .from(qrs)
    .innerJoin(qrCollections, eq(qrCollections.qrId, qrs.id))
    .where(eq(qrCollections.collectionId, id))
    .orderBy(desc(qrs.createdAt));

  return (
    <main className="mx-auto max-w-5xl px-4 py-10 space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold">{collection.title}</h1>
        {collection.description && (
          <p className="text-muted-foreground">{collection.description}</p>
        )}
        <p className="text-sm text-muted-foreground">{rows.length} QR codes</p>
      </header>
      {rows.length === 0 ? (
        <p className="text-muted-foreground">No QRs in this collection yet.</p>
      ) : (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-4">
          {rows.map((r) => (
            <QrCard key={r.id} id={r.id} title={r.title} url={r.url} />
          ))}
        </div>
      )}
    </main>
  );
}
```

- [ ] **Step 2: Verify**

Visit `/c/<id>` for a collection. Expected: title + card grid of its QRs. Click a card → QR detail page.

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat(qr-codes): public collection detail page"
```

---

## Task 18: PNG/SVG download API route

**Files:**
- Create: `apps/qr-codes/src/app/api/qr/[id]/route.ts`

- [ ] **Step 1: Implement**

Create `apps/qr-codes/src/app/api/qr/[id]/route.ts`:
```ts
import { eq } from "drizzle-orm";
import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/db/client";
import { qrs } from "@/db/schema";
import { renderPng, renderSvg } from "@/lib/qr";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const row = await db.query.qrs.findFirst({ where: eq(qrs.id, id) });
  if (!row) return new NextResponse("Not found", { status: 404 });

  const url = new URL(req.url);
  const format = (url.searchParams.get("format") ?? "png").toLowerCase();
  const filename = url.searchParams.get("filename") ?? `qr-${id}.${format}`;
  const widthRaw = Number(url.searchParams.get("w"));
  const width = Number.isFinite(widthRaw) && widthRaw > 0 ? widthRaw : 1024;

  if (format === "svg") {
    const svg = await renderSvg(row.url, { width, margin: 2 });
    return new NextResponse(svg, {
      headers: {
        "Content-Type": "image/svg+xml",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "public, max-age=3600",
      },
    });
  }

  if (format === "png") {
    const buf = await renderPng(row.url, { width, margin: 2 });
    return new NextResponse(new Uint8Array(buf), {
      headers: {
        "Content-Type": "image/png",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "public, max-age=3600",
      },
    });
  }

  return new NextResponse("Unsupported format", { status: 400 });
}
```

- [ ] **Step 2: Verify**

In the browser, visit `/api/qr/<id>?format=png` and confirm a PNG downloads. Same with `?format=svg`. From the `/q/<id>` page, click "Download PNG" and "Download SVG" buttons — both should save files.

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat(qr-codes): /api/qr/[id] route serving PNG and SVG downloads"
```

---

## Task 19: OpenGraph image with embedded QR

**Files:**
- Create: `apps/qr-codes/src/app/q/[id]/opengraph-image.tsx`

- [ ] **Step 1: Implement**

Create `apps/qr-codes/src/app/q/[id]/opengraph-image.tsx`:
```tsx
import { ImageResponse } from "next/og";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { qrs } from "@/db/schema";
import { renderPng } from "@/lib/qr";

export const runtime = "nodejs";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OgImage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const row = await db.query.qrs.findFirst({ where: eq(qrs.id, id) });
  if (!row) {
    return new ImageResponse(
      (
        <div
          style={{
            width: "100%",
            height: "100%",
            background: "#fff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 48,
          }}
        >
          QR not found
        </div>
      ),
      size
    );
  }

  const png = await renderPng(row.url, { width: 480, margin: 1 });
  const dataUrl = `data:image/png;base64,${png.toString("base64")}`;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          background: "#fff",
          display: "flex",
          padding: 60,
          gap: 60,
          alignItems: "center",
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={dataUrl} width={480} height={480} alt="QR" />
        <div style={{ display: "flex", flexDirection: "column", flex: 1, gap: 20 }}>
          <div style={{ fontSize: 56, fontWeight: 700, color: "#0a0a0a" }}>
            {row.title}
          </div>
          <div
            style={{
              fontSize: 22,
              color: "#525252",
              fontFamily: "monospace",
              wordBreak: "break-all",
              lineHeight: 1.3,
            }}
          >
            {row.url}
          </div>
        </div>
      </div>
    ),
    size
  );
}
```

- [ ] **Step 2: Verify**

Visit `/q/<id>/opengraph-image` directly — expect a 1200×630 PNG with the QR on the left and title/URL on the right. Then paste `/q/<id>` into a Slack or iMessage chat and confirm the preview shows the same image. (Cache may delay; use Slack’s "Refresh attachment" or wait a minute.)

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat(qr-codes): opengraph-image route renders QR + title for IM previews"
```

---

## Task 20: Deploy to Vercel

**Files:**
- Modify: `apps/qr-codes/next.config.ts` (if needed)
- Create: `vercel.json` at repo root (configure monorepo)

- [ ] **Step 1: Push to GitHub**

Tell the user to:
1. Create a new (private, recommended) repo on GitHub.
2. `git remote add origin git@github.com:<you>/guoba-vibe.git`
3. `git push -u origin main`

- [ ] **Step 2: Import into Vercel**

In Vercel dashboard:
- Import the repo.
- **Root directory:** `apps/qr-codes`
- Framework preset: Next.js (auto-detected)
- Install command: `pnpm install` (Vercel detects pnpm via root lockfile)
- Build command: `pnpm build` (default)

- [ ] **Step 3: Configure environment variables in Vercel**

Set the following for Production + Preview + Development:
- `DATABASE_URL` (same Neon URL, or use Vercel-Neon connection that auto-injects)
- `BETTER_AUTH_SECRET`
- `BETTER_AUTH_URL` (production: `https://<your-domain>.vercel.app`)
- `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`
- `ADMIN_GITHUB_ID`

- [ ] **Step 4: Update GitHub OAuth callback for prod**

In your GitHub OAuth App settings, add the production callback URL:
`https://<your-domain>.vercel.app/api/auth/callback/github`

You may add a second OAuth App if you want strict dev/prod separation.

- [ ] **Step 5: Trigger deploy and verify**

After Vercel finishes the deploy:
1. Visit the production URL — see landing page.
2. Sign in — get redirected to `/admin`.
3. Create a collection + QR.
4. Open `/q/<id>` on your phone, scan, confirm it opens the right app.
5. Paste `/q/<id>` in Slack — confirm OG preview renders the QR.

- [ ] **Step 6: Commit any tweaks and tag the v1**

```bash
cd /Users/shanyulong/riki/repo/guoba-vibe
git tag -a v0.1.0 -m "v0.1.0: initial QR codes app"
git push --tags
```

---

## Self-review notes

- **Spec coverage:** All four user requirements are covered — (1) collect QRs (Tasks 11, 13, 15), (2) collections grouping (Tasks 6, 10, 14, 17), (3) shareable single-QR detail page with big QR + URL parsing (Tasks 12, 16), (4) edit path and query via raw URL editor with live parse preview (Task 12, 15). Public collection page (Task 17), shadcn/ui + Tailwind (Task 2), better-auth + GitHub OAuth single-admin gate (Tasks 7, 8), Drizzle + Neon (Task 6), nanoid-8 IDs (Task 6), noindex on public pages (Tasks 16, 17), OG image (Task 19), PNG/SVG download (Task 18), and Vercel deploy (Task 20) are all included.
- **Out of scope for v1 (deliberately deferred):** soft delete, edit history, bulk import, scan analytics, QR styling/logo, mobile-first admin polish.
- **Database constraint note:** the "QR must belong to ≥1 collection" rule is enforced at the server-action layer via zod (`createQr`/`updateQr` in Task 11). DB-level enforcement isn’t possible cleanly with a junction table; this is the documented and accepted choice.
- **Auth note:** Middleware (Task 8) is an optimistic cookie check. The real ADMIN_GITHUB_ID check happens server-side in `requireAdmin()` (Task 7) and is invoked by the admin layout (Task 13) and every mutating server action (Tasks 10, 11).
