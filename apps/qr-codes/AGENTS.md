<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.

<!-- END:nextjs-agent-rules -->

---

# apps/qr-codes

Personal vault for mobile-app deep-link QR codes. Single admin, public read.

## Stack

- Next.js **16.2.6** App Router + Turbopack — see warning above.
- React 19 server components; client components opt-in (`"use client"`).
- Drizzle ORM 0.45 + Vercel Postgres (Neon).
- better-auth 1.6.11 + GitHub OAuth, gated by `ADMIN_GITHUB_ID`.
- Tailwind v4 (`@theme` syntax) + shadcn/ui Nova preset.
- Vitest 4 for unit tests.

## Layout

```
src/
  app/          route handlers and pages
    (admin)/    admin layout group (auth-gated via proxy.ts)
    api/qr/     PNG/SVG download endpoint
    c/[id]/     public collection page
    q/[id]/     public QR detail page (+ opengraph-image.tsx)
  auth/         better-auth + admin gate (cache()-wrapped session reader)
  components/   UI; server by default
  db/           Drizzle schema + client
  lib/          qr.ts (render), url-parse.ts, env.ts (server-only)
  server/       server actions (qrs.ts, collections.ts)
  proxy.ts      Next 16 replacement for middleware.ts
tests/          vitest (also picks up src/**/*.test.ts)
drizzle/        generated migrations (commit them)
```

## Conventions worth following

- **server-only**: `import "server-only"` in modules that touch env / db / secrets. Stops accidental client bundling.
- **Session reads**: `getAdminSession` is wrapped in React `cache()` — call freely per render, it dedupes.
- **Server actions that redirect**: `redirect()` throws `NEXT_REDIRECT`. In client form handlers, re-throw via `isRedirectError(err)` before showing a toast (see `qr-form.tsx`, `delete-button.tsx`). The helper lives at `next/dist/client/components/redirect-error` — internal path, may break on minor bumps; fallback is `err.message === "NEXT_REDIRECT"`.
- **IDs**: `nanoid8` from a custom 55-char URL-safe alphabet (no look-alikes). Don't swap for uuid.
- **Open-link safety**: `/q/[id]` blocks `javascript:` / `data:` / `vbscript:` / `file:` schemes before rendering an `<a>`. Keep that blocklist intact when touching URL rendering.
- **Drizzle `updatedAt`**: every `updated_at` column uses `.$onUpdate(() => new Date())`. Add it to new tables too.
- **Drizzle CLI needs env**: `db:*` scripts are wrapped in `dotenv -e .env.local --`. drizzle-kit doesn't load dotenv on its own.

## Test workflow — TDD by default

For any non-trivial change to `lib/`, `server/`, or `auth/`:

1. **Write the failing test first** in `tests/<name>.test.ts` (or co-located `*.test.ts`). State the behavior in `describe`/`it` names, not the implementation.
2. **Run it red**: `pnpm --filter qr-codes test -- <name>` — confirm it fails for the right reason.
3. **Minimum code to green**. No extras.
4. **Re-run**: `pnpm --filter qr-codes test`. Don't move on until the bar is green.
5. **Refactor** with the test as your safety net.

Skip TDD only for: UI tweaks, copy changes, config edits. For those, verify visually via `pnpm dev` + browser before pushing.

### Existing tests as templates

- `tests/url-parse.test.ts` — pure function, edge cases per `it`.
- `tests/qr.test.ts` — async renderer, asserts on output shape (magic bytes, XML preamble).

### Commands

```bash
pnpm --filter qr-codes test              # one-shot
pnpm --filter qr-codes test:watch        # TDD loop
pnpm --filter qr-codes test -- url-parse # single file by name match
pnpm --filter qr-codes build             # typecheck + bundle
pnpm --filter qr-codes lint
pnpm --filter qr-codes db:generate       # after schema edits
pnpm --filter qr-codes db:push           # apply to Neon (uses .env.local)
```

Tests run in `node` environment — no DOM. If you need to test a React component, set up `jsdom` in `vitest.config.ts` first and document why.

## Local verify > prod verify

For UI / visual changes: `pnpm dev` (port 3000), drive with `agent-browser` against `http://localhost:3000`, then push. Don't use Vercel deploys as the iteration loop.

The OAuth app is registered with `http://localhost:3000/api/auth/callback/github` so local sign-in works. Local writes hit the same Neon DB as prod — clean up test data when done.

## Agent Browser auth session

The admin UI (`/admin`) is gated by GitHub OAuth (`ADMIN_GITHUB_ID`). To avoid re-doing OAuth on every browser command, use a named session that persists cookies across daemon restarts.

**Rule:** every `agent-browser` invocation for `qr-codes` must be prefixed with:

```bash
AGENT_BROWSER_SESSION_NAME=guoba agent-browser <cmd>
```

Cookies are saved to `~/.agent-browser/sessions/guoba-default.json` on daemon close and restored on next open. Do not export this env var globally; keep it per-command.

**One-time bootstrap** (only if session file is missing or cookies expired):

```bash
AGENT_BROWSER_SESSION_NAME=guoba agent-browser close
AGENT_BROWSER_SESSION_NAME=guoba agent-browser --headed open https://github.com
# user logs into github.com manually in the headed window
AGENT_BROWSER_SESSION_NAME=guoba agent-browser close
```

After bootstrap, opening `http://localhost:3000/admin` or `https://guoba-qr-codes.vercel.app/admin` should auto-complete the GitHub OAuth redirect. Do not try to reuse the user's real Chrome profile via `--profile Default`; agent-browser uses a different Chrome for Testing binary and its encrypted cookies will not decrypt.
