# guoba-stream Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A private, invite-only web app that takes an X/Twitter share link and downloads the tweet's videos/GIFs, with per-video quality selection and batch download. Mobile-first.

**Architecture:** Vite + React SPA in `apps/guoba-stream` with two Vercel serverless functions (`api/resolve.ts`, `api/download.ts`) written as web-standard handlers (`GET(request: Request): Promise<Response>`). Pure logic lives in `lib/` (shared by api + tests). Tweet data comes from X's syndication API (`cdn.syndication.twimg.com/tweet-result`); downloads stream through our proxy with `Content-Disposition: attachment`, protected by short-lived HMAC-signed URLs. Access control = comma-separated access keys in `ACCESS_KEYS` env var, validated on every API call.

**Tech Stack:** React 19, TypeScript, Vite 8, Tailwind 4, lucide-react, Vitest (node env), Playwright (desktop chromium + iPhone 13 webkit), oxlint (root binary), pnpm workspace.

**Verified upstream facts (probed live on 2026-07-07, do not re-derive):**
- `GET https://cdn.syndication.twimg.com/tweet-result?id=<id>&token=<t>` returns 200 + `{"__typename":"Tweet", "id_str", "text", "user":{name,screen_name,profile_image_url_https}, "mediaDetails":[...]}` for live tweets. Junk tokens are currently accepted, but we compute the react-tweet algorithm anyway: `((Number(id)/1e15)*Math.PI).toString(36).replace(/(0+|\.)/g,'')`. For id `1628832338187636740` the token is `3y54libozsy`.
- Video media: `type:"video"`, `media_url_https` (thumbnail), `video_info:{aspect_ratio:[16,9], duration_millis, variants:[{content_type, bitrate?, url}]}`. mp4 variants carry dimensions in the URL path (`/480x270/`, `/avc1/1920x1080/`); the `application/x-mpegURL` variant has no bitrate and must be filtered out. GIFs: `type:"animated_gif"`, single mp4 variant with `bitrate:0`, URL `https://video.twimg.com/tweet_video/<x>.mp4`, no `duration_millis`.
- Deleted/restricted tweet: 200 + `{"__typename":"TweetTombstone","tombstone":{...}}`. Malformed id: HTTP 400.
- `t.co` short links answer HEAD with 301 + `location` header.
- Node 24 allows `new Response(null, {status:301, headers:{location}})` for mocking.

**Approved design (mock approved by Riki):** dark warm-charcoal theme `#191412`, ember accent `#E07A3F`, Bricolage Grotesque display + IBM Plex Mono body. Screens: access gate → URL form → tweet card + media cards (inline `<video>` preview, quality `<select>`, selection checkbox, Save button, raw-link fallback) + sticky bottom batch bar. All UI copy in English. Mobile-first (single-column cards, 44px touch targets, `env(safe-area-inset-bottom)`, 16px inputs to prevent iOS zoom).

---

## File structure

```
apps/guoba-stream/
  package.json  index.html  vite.config.ts  dev-api-plugin.ts
  tsconfig.json tsconfig.app.json tsconfig.node.json
  .oxlintrc.json  .env.example  playwright.config.ts
  README.md  DESIGN.md
  api/
    resolve.ts   resolve.test.ts     # auth + parse + syndication fetch + map + sign
    download.ts  download.test.ts    # verify signature + stream proxy
  lib/                               # pure logic, no framework imports
    types.ts                         # shared DTOs (also imported by src/)
    tweet-url.ts   tweet-url.test.ts
    syndication.ts syndication.test.ts
    sign.ts        sign.test.ts
    auth.ts        auth.test.ts
    fixtures/video-tweet.json  fixtures/gif-tweet.json
  src/
    main.tsx  app.tsx  styles.css  vite-env.d.ts
    lib/access-key.ts  lib/api.ts  lib/download.ts  lib/format.ts  lib/format.test.ts
    components/gate.tsx  url-form.tsx  tweet-card.tsx  media-card.tsx
    components/download-bar.tsx  error-banner.tsx
  e2e/
    fixtures.ts  app.spec.ts
.github/workflows/guoba-stream-e2e.yml
```

Monorepo conventions that apply (do not deviate): oxlint/tsgolint binaries come from the **root** — no lint devDeps in the app package.json. Root `.npmrc` pins the public registry — don't touch it. `pnpm-workspace.yaml` already includes `apps/*` — no edit needed.

---

### Task 1: Scaffold the app skeleton

**Files:**
- Create: `apps/guoba-stream/package.json`, `index.html`, `vite.config.ts`, `tsconfig.json`, `tsconfig.app.json`, `tsconfig.node.json`, `.oxlintrc.json`, `.env.example`, `src/main.tsx`, `src/app.tsx`, `src/styles.css`, `src/vite-env.d.ts`

- [ ] **Step 1: Write `apps/guoba-stream/package.json`**

```json
{
  "name": "guoba-stream",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite --host 0.0.0.0",
    "build": "tsc -b && vite build",
    "lint": "oxlint",
    "preview": "vite preview --host 0.0.0.0",
    "test": "vitest run",
    "test:e2e": "pnpm run build && playwright test",
    "test:watch": "vitest"
  },
  "dependencies": {
    "@fontsource-variable/bricolage-grotesque": "^5.2.5",
    "@fontsource/ibm-plex-mono": "^5.2.5",
    "lucide-react": "^1.16.0",
    "react": "19.2.4",
    "react-dom": "19.2.4"
  },
  "devDependencies": {
    "@playwright/test": "^1.61.1",
    "@tailwindcss/vite": "^4.3.0",
    "@types/node": "^24.12.4",
    "@types/react": "^19",
    "@types/react-dom": "^19",
    "@vitejs/plugin-react": "^6.0.2",
    "tailwindcss": "^4.3.0",
    "typescript": "^5",
    "vite": "^8.0.14",
    "vitest": "^4.1.7"
  }
}
```

- [ ] **Step 2: Write `apps/guoba-stream/index.html`**

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
    <meta name="theme-color" content="#191412" />
    <title>guoba stream</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 3: Write `apps/guoba-stream/vite.config.ts`**

The `devApiPlugin` import will exist after Task 7; for now create the config WITHOUT it, and Task 7 adds it. Initial version:

```ts
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [tailwindcss(), react()],
  test: {
    environment: 'node',
    include: ['lib/**/*.test.ts', 'api/**/*.test.ts', 'src/**/*.test.ts'],
  },
})
```

(No `base: './'` — Vercel serves from root and relative base breaks nothing but adds noise; qr-vault needed it, we don't.)

- [ ] **Step 4: Write the three tsconfigs**

`apps/guoba-stream/tsconfig.json`:

```json
{
  "files": [],
  "references": [{ "path": "./tsconfig.app.json" }, { "path": "./tsconfig.node.json" }]
}
```

`apps/guoba-stream/tsconfig.app.json` (mirrors qr-vault, adds `lib` for shared DTO types):

```json
{
  "compilerOptions": {
    "tsBuildInfoFile": "./node_modules/.tmp/tsconfig.app.tsbuildinfo",
    "target": "ES2022",
    "useDefineForClassFields": true,
    "lib": ["DOM", "DOM.Iterable", "ES2023"],
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
    "types": ["vite/client"]
  },
  "include": ["src"]
}
```

(`lib` is deliberately NOT in the app include: node-only lib modules (sign.ts uses node:crypto) are typechecked via tsconfig.node.json; the pure-types `lib/types.ts` gets pulled into the browser program transitively when src imports it.)

`apps/guoba-stream/tsconfig.node.json`:

```json
{
  "compilerOptions": {
    "tsBuildInfoFile": "./node_modules/.tmp/tsconfig.node.tsbuildinfo",
    "target": "ES2023",
    "lib": ["ES2023"],
    "skipLibCheck": true,
    "esModuleInterop": true,
    "strict": true,
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "types": ["node"]
  },
  "include": ["vite.config.ts", "dev-api-plugin.ts", "playwright.config.ts", "api", "lib", "e2e"]
}
```

- [ ] **Step 5: Write `apps/guoba-stream/.oxlintrc.json`** (qr-vault pattern; node env added for api/lib; max-lines covers api and lib too)

```json
{
  "$schema": "../../node_modules/oxlint/configuration_schema.json",
  "plugins": ["react", "typescript", "unicorn", "oxc", "import", "promise", "jsdoc"],
  "categories": {
    "correctness": "error",
    "suspicious": "error",
    "perf": "warn"
  },
  "options": {
    "typeAware": true,
    "typeCheck": true,
    "maxWarnings": 0,
    "reportUnusedDisableDirectives": "error"
  },
  "env": {
    "builtin": true,
    "browser": true,
    "node": true
  },
  "ignorePatterns": ["dist"],
  "rules": {
    "react/react-in-jsx-scope": "off",
    "import/no-unassigned-import": "off",
    "promise/always-return": "off"
  },
  "overrides": [
    {
      "files": ["src/**/*.{ts,tsx}", "api/**/*.ts", "lib/**/*.ts"],
      "rules": {
        "max-lines": ["error", { "max": 200, "skipBlankLines": true, "skipComments": true }]
      }
    },
    {
      "files": ["**/*.test.{ts,tsx}", "e2e/**"],
      "rules": {
        "max-lines": "off"
      }
    }
  ]
}
```

- [ ] **Step 6: Write `apps/guoba-stream/.env.example`** (root `.gitignore` ignores `.env.*` but keeps `.env.example`)

```
ACCESS_KEYS=dev-key
DOWNLOAD_SIGNING_SECRET=change-me-32-chars-min
```

- [ ] **Step 7: Write minimal `src/`**

`src/vite-env.d.ts`:

```ts
/// <reference types="vite/client" />
```

`src/styles.css` (font imports live here, NOT in main.tsx — fontsource packages ship no type declarations, so bare TSX side-effect imports fail oxlint's type-aware check; matches qr-vault):

```css
@import '@fontsource-variable/bricolage-grotesque';
@import '@fontsource/ibm-plex-mono/400.css';
@import '@fontsource/ibm-plex-mono/500.css';
@import 'tailwindcss';

@theme {
  --color-coal: #191412;
  --color-pan: #221b17;
  --color-pan-deep: #100c0a;
  --color-crust: #33241b;
  --color-seam: #3a2e26;
  --color-seam-strong: #5a4636;
  --color-rice: #f4eae0;
  --color-husk: #b5a192;
  --color-bran: #8a7666;
  --color-faint: #5f4f42;
  --color-ember: #e07a3f;
  --color-ember-soft: #e8a06b;
  --color-ember-ink: #2a1408;
  --font-display: 'Bricolage Grotesque Variable', sans-serif;
  --font-mono: 'IBM Plex Mono', monospace;
}

html {
  background: var(--color-coal);
}

body {
  margin: 0;
  font-family: var(--font-mono);
  color: var(--color-rice);
}
```

`src/main.tsx`:

```tsx
import './styles.css'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import { App } from './app'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
```

`src/app.tsx` (placeholder, replaced in Task 8):

```tsx
export function App() {
  return <p className="p-4 text-husk">guoba stream — under construction</p>
}
```

- [ ] **Step 8: Install and verify**

Run from repo root:

```bash
pnpm install
pnpm --filter guoba-stream lint
pnpm --filter guoba-stream build
```

Expected: install resolves (public registry), lint passes with 0 warnings, build emits `apps/guoba-stream/dist`. If `@fontsource` versions don't resolve, check the latest with `pnpm view @fontsource-variable/bricolage-grotesque version` and adjust the range.

- [ ] **Step 9: Commit**

```bash
git add apps/guoba-stream pnpm-lock.yaml
git commit -m "feat(guoba-stream): scaffold app skeleton"
```

---

### Task 2: Tweet URL parsing (`lib/tweet-url.ts`)

Query params are stripped **structurally**: the parser only ever reads `URL.pathname`, so `?s=46&t=…` tracking params never survive. This is the privacy requirement from the spec.

**Files:**
- Create: `apps/guoba-stream/lib/types.ts`, `lib/tweet-url.ts`
- Test: `apps/guoba-stream/lib/tweet-url.test.ts`

- [ ] **Step 1: Write `lib/types.ts`** (shared DTOs — the contract between api and frontend)

```ts
export type MediaKind = 'video' | 'gif'

export interface MediaVariant {
  label: string
  width: number | null
  height: number | null
  bitrate: number
  rawUrl: string
  downloadUrl: string
}

export interface MediaItem {
  index: number
  kind: MediaKind
  thumbnailUrl: string
  durationMs: number | null
  variants: MediaVariant[]
}

export interface ResolvedTweet {
  id: string
  authorName: string
  authorHandle: string
  avatarUrl: string
  text: string
  media: MediaItem[]
}

export type ResolveErrorCode = 'invalid_link' | 'restricted' | 'no_video' | 'upstream'
```

- [ ] **Step 2: Write the failing test `lib/tweet-url.test.ts`**

```ts
import { describe, expect, it, vi } from 'vitest'

import { parseTweetUrl, resolveTweetId } from './tweet-url'

describe('parseTweetUrl', () => {
  it.each([
    'https://x.com/vercel/status/1628832338187636740',
    'https://twitter.com/vercel/status/1628832338187636740',
    'https://mobile.twitter.com/vercel/status/1628832338187636740',
    'https://www.x.com/vercel/status/1628832338187636740',
    'https://x.com/i/status/1628832338187636740',
    'https://x.com/i/web/status/1628832338187636740',
    'https://x.com/vercel/status/1628832338187636740?s=46&t=abcDEF',
    'https://x.com/vercel/status/1628832338187636740/video/1',
    '  https://x.com/vercel/status/1628832338187636740  ',
  ])('extracts the tweet id from %s', (input) => {
    expect(parseTweetUrl(input)).toEqual({ ok: true, tweetId: '1628832338187636740' })
  })

  it.each([
    'not a url',
    'https://example.com/vercel/status/123',
    'https://x.com/vercel',
    'https://x.com/vercel/status/abc',
    'https://x.com/vercel/status/123abc',
    'ftp://x.com/vercel/status/123',
    '',
  ])('rejects %s', (input) => {
    expect(parseTweetUrl(input)).toEqual({ ok: false, reason: 'invalid' })
  })

  it('flags t.co links for redirect resolution and drops query params', () => {
    expect(parseTweetUrl('https://t.co/AbC123?xyz=1')).toEqual({
      ok: false,
      reason: 'shortlink',
      url: 'https://t.co/AbC123',
    })
  })
})

describe('resolveTweetId', () => {
  it('returns the id directly for status links', async () => {
    await expect(resolveTweetId('https://x.com/a/status/42')).resolves.toBe('42')
  })

  it('follows one t.co redirect', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      new Response(null, { status: 301, headers: { location: 'https://x.com/a/status/42?s=20' } }),
    )
    await expect(resolveTweetId('https://t.co/abc', fetchImpl)).resolves.toBe('42')
    expect(fetchImpl).toHaveBeenCalledWith('https://t.co/abc', { method: 'HEAD', redirect: 'manual' })
  })

  it('gives up when the redirect target is not a tweet', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      new Response(null, { status: 301, headers: { location: 'https://nextjs.org/13-2' } }),
    )
    await expect(resolveTweetId('https://t.co/abc', fetchImpl)).resolves.toBeNull()
  })

  it('returns null when the redirect has no location', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(new Response(null, { status: 200 }))
    await expect(resolveTweetId('https://t.co/abc', fetchImpl)).resolves.toBeNull()
  })

  it('returns null for garbage', async () => {
    await expect(resolveTweetId('nope')).resolves.toBeNull()
  })

  it('propagates network errors from the redirect hop', async () => {
    const fetchImpl = vi.fn().mockRejectedValue(new TypeError('fetch failed'))
    await expect(resolveTweetId('https://t.co/abc', fetchImpl)).rejects.toThrow()
  })
})
```

- [ ] **Step 3: Run test to verify it fails**

```bash
pnpm --filter guoba-stream exec vitest run lib/tweet-url.test.ts
```

Expected: FAIL — cannot resolve `./tweet-url`.

- [ ] **Step 4: Write `lib/tweet-url.ts`**

```ts
const TWEET_HOSTS = new Set([
  'x.com',
  'www.x.com',
  'mobile.x.com',
  'twitter.com',
  'www.twitter.com',
  'mobile.twitter.com',
])

const STATUS_PATH = /^\/(?:i\/web\/status|i\/status|[A-Za-z0-9_]{1,15}\/status)\/(\d{1,25})(?=$|\/)/

export type ParsedTweetUrl =
  | { ok: true; tweetId: string }
  | { ok: false; reason: 'invalid' }
  | { ok: false; reason: 'shortlink'; url: string }

export function parseTweetUrl(input: string): ParsedTweetUrl {
  let url: URL
  try {
    url = new URL(input.trim())
  } catch {
    return { ok: false, reason: 'invalid' }
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') return { ok: false, reason: 'invalid' }
  const host = url.hostname.toLowerCase()
  if (host === 't.co') return { ok: false, reason: 'shortlink', url: `https://t.co${url.pathname}` }
  if (!TWEET_HOSTS.has(host)) return { ok: false, reason: 'invalid' }
  const match = STATUS_PATH.exec(url.pathname)
  if (!match) return { ok: false, reason: 'invalid' }
  return { ok: true, tweetId: match[1] }
}

export async function resolveTweetId(input: string, fetchImpl: typeof fetch = fetch): Promise<string | null> {
  const parsed = parseTweetUrl(input)
  if (parsed.ok) return parsed.tweetId
  if (parsed.reason !== 'shortlink') return null
  const response = await fetchImpl(parsed.url, { method: 'HEAD', redirect: 'manual' })
  const location = response.headers.get('location')
  if (!location) return null
  const redirected = parseTweetUrl(location)
  return redirected.ok ? redirected.tweetId : null
}
```

- [ ] **Step 5: Run test to verify it passes**

```bash
pnpm --filter guoba-stream exec vitest run lib/tweet-url.test.ts
```

Expected: PASS (all cases).

- [ ] **Step 6: Commit**

```bash
git add apps/guoba-stream/lib
git commit -m "feat(guoba-stream): tweet URL parser with t.co redirect and query stripping"
```

---

### Task 3: Syndication API mapping (`lib/syndication.ts`)

**Files:**
- Create: `apps/guoba-stream/lib/syndication.ts`, `lib/fixtures/video-tweet.json`, `lib/fixtures/gif-tweet.json`
- Test: `apps/guoba-stream/lib/syndication.test.ts`

- [ ] **Step 1: Write `lib/fixtures/video-tweet.json`** (trimmed from a real syndication response, probed 2026-07-07)

```json
{
  "__typename": "Tweet",
  "id_str": "1585341984679469056",
  "text": "Entering Twitter HQ – let that sink in!",
  "user": {
    "name": "Elon Musk",
    "screen_name": "elonmusk",
    "profile_image_url_https": "https://pbs.twimg.com/profile_images/abc_normal.jpg"
  },
  "mediaDetails": [
    {
      "type": "video",
      "media_url_https": "https://pbs.twimg.com/ext_tw_video_thumb/1585341912877146112/pu/img/DwHZuBLIbwSCJDXm.jpg",
      "video_info": {
        "aspect_ratio": [16, 9],
        "duration_millis": 9301,
        "variants": [
          {
            "content_type": "application/x-mpegURL",
            "url": "https://video.twimg.com/ext_tw_video/1585341912877146112/pu/pl/TyyErONagoNhghKI.m3u8?tag=14&v=9a8"
          },
          {
            "bitrate": 256000,
            "content_type": "video/mp4",
            "url": "https://video.twimg.com/ext_tw_video/1585341912877146112/pu/vid/480x270/6tarM2TjLH1Ahh90.mp4?tag=14"
          },
          {
            "bitrate": 2176000,
            "content_type": "video/mp4",
            "url": "https://video.twimg.com/ext_tw_video/1585341912877146112/pu/vid/1280x720/cwj11yOgYZ05R_sY.mp4?tag=14"
          },
          {
            "bitrate": 10368000,
            "content_type": "video/mp4",
            "url": "https://video.twimg.com/ext_tw_video/1585341912877146112/pu/vid/1920x1080/aeoVUvTgj4wHShhN.mp4?tag=14"
          }
        ]
      }
    }
  ]
}
```

- [ ] **Step 2: Write `lib/fixtures/gif-tweet.json`** (synthetic — shape matches known `animated_gif` responses; verify against a real GIF tweet during Task 13 manual QA)

```json
{
  "__typename": "Tweet",
  "id_str": "1111",
  "text": "gif tweet",
  "user": {
    "name": "Gif Person",
    "screen_name": "gifperson",
    "profile_image_url_https": "https://pbs.twimg.com/profile_images/g_normal.jpg"
  },
  "mediaDetails": [
    {
      "type": "animated_gif",
      "media_url_https": "https://pbs.twimg.com/tweet_video_thumb/AbCdEf.jpg",
      "video_info": {
        "aspect_ratio": [1, 1],
        "variants": [
          {
            "bitrate": 0,
            "content_type": "video/mp4",
            "url": "https://video.twimg.com/tweet_video/AbCdEf.mp4"
          }
        ]
      }
    },
    {
      "type": "photo",
      "media_url_https": "https://pbs.twimg.com/media/photo.jpg"
    }
  ]
}
```

- [ ] **Step 3: Write the failing test `lib/syndication.test.ts`**

```ts
import { describe, expect, it } from 'vitest'

import gifTweet from './fixtures/gif-tweet.json'
import videoTweet from './fixtures/video-tweet.json'
import { mapTweetResult, syndicationToken, syndicationUrl, type RawTweetResult } from './syndication'

describe('syndicationToken', () => {
  it('matches the react-tweet token algorithm', () => {
    expect(syndicationToken('1628832338187636740')).toBe('3y54libozsy')
  })
})

describe('syndicationUrl', () => {
  it('builds the tweet-result URL with id and token', () => {
    const url = new URL(syndicationUrl('1628832338187636740'))
    expect(url.origin + url.pathname).toBe('https://cdn.syndication.twimg.com/tweet-result')
    expect(url.searchParams.get('id')).toBe('1628832338187636740')
    expect(url.searchParams.get('token')).toBe('3y54libozsy')
  })
})

describe('mapTweetResult', () => {
  it('maps a video tweet: filters m3u8, sorts by bitrate desc, labels by height', () => {
    const mapped = mapTweetResult(videoTweet as RawTweetResult)
    if (!mapped.ok) throw new Error('expected ok')
    expect(mapped.tweet.authorHandle).toBe('elonmusk')
    expect(mapped.tweet.media).toHaveLength(1)
    const media = mapped.tweet.media[0]
    expect(media.kind).toBe('video')
    expect(media.durationMs).toBe(9301)
    expect(media.variants.map((v) => v.label)).toEqual(['1080p', '720p', '270p'])
    expect(media.variants[0].width).toBe(1920)
    expect(media.variants[0].rawUrl).toContain('1920x1080')
  })

  it('maps an animated gif and skips photos', () => {
    const mapped = mapTweetResult(gifTweet as RawTweetResult)
    if (!mapped.ok) throw new Error('expected ok')
    expect(mapped.tweet.media).toHaveLength(1)
    const media = mapped.tweet.media[0]
    expect(media.kind).toBe('gif')
    expect(media.durationMs).toBeNull()
    expect(media.variants).toEqual([
      expect.objectContaining({ label: 'gif', bitrate: 0, rawUrl: 'https://video.twimg.com/tweet_video/AbCdEf.mp4' }),
    ])
  })

  it('reports tombstones as restricted', () => {
    expect(mapTweetResult({ __typename: 'TweetTombstone' })).toEqual({ ok: false, reason: 'restricted' })
  })

  it('reports photo-only tweets as no_video', () => {
    const raw: RawTweetResult = {
      __typename: 'Tweet',
      id_str: '2',
      text: 'photos only',
      user: { name: 'A', screen_name: 'a', profile_image_url_https: '' },
      mediaDetails: [{ type: 'photo', media_url_https: 'https://pbs.twimg.com/media/p.jpg' }],
    }
    expect(mapTweetResult(raw)).toEqual({ ok: false, reason: 'no_video' })
  })

  it('reports text-only tweets as no_video', () => {
    expect(mapTweetResult({ __typename: 'Tweet', id_str: '3', text: 'hi' })).toEqual({
      ok: false,
      reason: 'no_video',
    })
  })
})
```

- [ ] **Step 4: Run test to verify it fails**

```bash
pnpm --filter guoba-stream exec vitest run lib/syndication.test.ts
```

Expected: FAIL — cannot resolve `./syndication`.

- [ ] **Step 5: Write `lib/syndication.ts`**

```ts
import type { MediaItem, MediaKind, ResolvedTweet } from './types'

export function syndicationToken(tweetId: string): string {
  return ((Number(tweetId) / 1e15) * Math.PI).toString(36).replace(/(0+|\.)/g, '')
}

export function syndicationUrl(tweetId: string): string {
  const params = new URLSearchParams({ id: tweetId, token: syndicationToken(tweetId) })
  return `https://cdn.syndication.twimg.com/tweet-result?${params.toString()}`
}

interface RawVariant {
  content_type: string
  url: string
  bitrate?: number
}

interface RawMedia {
  type: string
  media_url_https: string
  video_info?: { duration_millis?: number; variants: RawVariant[] }
}

export interface RawTweetResult {
  __typename?: string
  id_str?: string
  text?: string
  user?: { name?: string; screen_name?: string; profile_image_url_https?: string }
  mediaDetails?: RawMedia[]
}

export type MappedTweet = { ok: true; tweet: ResolvedTweet } | { ok: false; reason: 'restricted' | 'no_video' }

const DIMENSIONS = /\/(\d{2,5})x(\d{2,5})\//

function mapKind(type: string): MediaKind | null {
  if (type === 'video') return 'video'
  if (type === 'animated_gif') return 'gif'
  return null
}

export function mapTweetResult(raw: RawTweetResult): MappedTweet {
  if (raw.__typename !== 'Tweet') return { ok: false, reason: 'restricted' }
  const media: MediaItem[] = []
  for (const item of raw.mediaDetails ?? []) {
    const kind = mapKind(item.type)
    if (!kind || !item.video_info) continue
    const variants = item.video_info.variants
      .filter((variant) => variant.content_type === 'video/mp4')
      .map((variant) => {
        const dims = DIMENSIONS.exec(variant.url)
        const width = dims ? Number(dims[1]) : null
        const height = dims ? Number(dims[2]) : null
        return {
          label: kind === 'gif' ? 'gif' : height ? `${height}p` : 'mp4',
          width,
          height,
          bitrate: variant.bitrate ?? 0,
          rawUrl: variant.url,
          downloadUrl: '',
        }
      })
      .sort((a, b) => b.bitrate - a.bitrate)
    if (variants.length === 0) continue
    media.push({
      index: media.length,
      kind,
      thumbnailUrl: item.media_url_https,
      durationMs: item.video_info.duration_millis ?? null,
      variants,
    })
  }
  if (media.length === 0) return { ok: false, reason: 'no_video' }
  return {
    ok: true,
    tweet: {
      id: raw.id_str ?? '',
      authorName: raw.user?.name ?? '',
      authorHandle: raw.user?.screen_name ?? '',
      avatarUrl: raw.user?.profile_image_url_https ?? '',
      text: raw.text ?? '',
      media,
    },
  }
}
```

- [ ] **Step 6: Run test to verify it passes**

```bash
pnpm --filter guoba-stream exec vitest run lib/syndication.test.ts
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add apps/guoba-stream/lib
git commit -m "feat(guoba-stream): syndication API token, URL and response mapping"
```

---

### Task 4: HMAC signing + access keys (`lib/sign.ts`, `lib/auth.ts`)

**Files:**
- Create: `apps/guoba-stream/lib/sign.ts`, `lib/auth.ts`
- Test: `apps/guoba-stream/lib/sign.test.ts`, `lib/auth.test.ts`

- [ ] **Step 1: Write the failing test `lib/sign.test.ts`**

```ts
import { describe, expect, it } from 'vitest'

import { buildDownloadPath, signDownload, verifyDownload } from './sign'

const SECRET = 'test-secret'
const URL_OK = 'https://video.twimg.com/ext_tw_video/1/pu/vid/1280x720/abc.mp4?tag=14'

describe('sign/verify', () => {
  it('round-trips a signed download', () => {
    const sig = signDownload(URL_OK, 'a_1.mp4', 1000, SECRET)
    expect(verifyDownload(URL_OK, 'a_1.mp4', 1000, sig, SECRET, 999)).toBe('ok')
  })

  it('rejects a tampered url', () => {
    const sig = signDownload(URL_OK, 'a_1.mp4', 1000, SECRET)
    expect(verifyDownload('https://video.twimg.com/other.mp4', 'a_1.mp4', 1000, sig, SECRET, 999)).toBe(
      'bad_signature',
    )
  })

  it('rejects a tampered filename', () => {
    const sig = signDownload(URL_OK, 'a_1.mp4', 1000, SECRET)
    expect(verifyDownload(URL_OK, 'b.mp4', 1000, sig, SECRET, 999)).toBe('bad_signature')
  })

  it('rejects expiry in the past', () => {
    const sig = signDownload(URL_OK, 'a_1.mp4', 1000, SECRET)
    expect(verifyDownload(URL_OK, 'a_1.mp4', 1000, sig, SECRET, 1001)).toBe('expired')
  })

  it('rejects non-twimg hosts even with a valid signature', () => {
    const evil = 'https://evil.example.com/x.mp4'
    const sig = signDownload(evil, 'a.mp4', 1000, SECRET)
    expect(verifyDownload(evil, 'a.mp4', 1000, sig, SECRET, 999)).toBe('bad_url')
  })

  it('rejects http (non-https) twimg urls', () => {
    const insecure = 'http://video.twimg.com/x.mp4'
    const sig = signDownload(insecure, 'a.mp4', 1000, SECRET)
    expect(verifyDownload(insecure, 'a.mp4', 1000, sig, SECRET, 999)).toBe('bad_url')
  })

  it('rejects malformed signatures without throwing', () => {
    expect(verifyDownload(URL_OK, 'a.mp4', 1000, 'zz-not-hex', SECRET, 999)).toBe('bad_signature')
    expect(verifyDownload(URL_OK, 'a.mp4', 1000, '', SECRET, 999)).toBe('bad_signature')
  })

  it('does not collide across field boundaries', () => {
    const a = signDownload('https://video.twimg.com/a\nb.mp4', 'c.mp4', 1000, SECRET)
    const b = signDownload('https://video.twimg.com/a', 'b.mp4\nc.mp4', 1000, SECRET)
    expect(a).not.toBe(b)
  })

  it('builds a relative download path carrying all signed params', () => {
    const path = buildDownloadPath(URL_OK, 'a_1.mp4', 1000, SECRET)
    expect(path.startsWith('/api/download?')).toBe(true)
    const params = new URL(`http://x${path}`).searchParams
    expect(params.get('url')).toBe(URL_OK)
    expect(params.get('name')).toBe('a_1.mp4')
    expect(params.get('exp')).toBe('1000')
    expect(verifyDownload(URL_OK, 'a_1.mp4', 1000, params.get('sig')!, SECRET, 999)).toBe('ok')
  })
})
```

- [ ] **Step 2: Write the failing test `lib/auth.test.ts`**

```ts
import { describe, expect, it } from 'vitest'

import { isValidAccessKey } from './auth'

describe('isValidAccessKey', () => {
  it('accepts a key from the comma-separated list, ignoring whitespace', () => {
    expect(isValidAccessKey('bravo', 'alpha, bravo ,charlie')).toBe(true)
    expect(isValidAccessKey(' bravo ', 'alpha,bravo')).toBe(true)
  })

  it('rejects unknown, empty, or missing keys', () => {
    expect(isValidAccessKey('delta', 'alpha,bravo')).toBe(false)
    expect(isValidAccessKey('', 'alpha,bravo')).toBe(false)
    expect(isValidAccessKey(null, 'alpha,bravo')).toBe(false)
  })

  it('rejects everything when the env var is unset or empty', () => {
    expect(isValidAccessKey('alpha', undefined)).toBe(false)
    expect(isValidAccessKey('alpha', '')).toBe(false)
    expect(isValidAccessKey('', '')).toBe(false)
  })
})
```

- [ ] **Step 3: Run tests to verify they fail**

```bash
pnpm --filter guoba-stream exec vitest run lib/sign.test.ts lib/auth.test.ts
```

Expected: FAIL — modules not found.

- [ ] **Step 4: Write `lib/sign.ts`**

```ts
import { createHmac, timingSafeEqual } from 'node:crypto'

const ALLOWED_HOST = 'video.twimg.com'

export function signDownload(rawUrl: string, filename: string, expiresAtSec: number, secret: string): string {
  const mac = createHmac('sha256', secret)
  mac.update(JSON.stringify([rawUrl, filename, expiresAtSec]))
  return mac.digest('hex')
}

export function buildDownloadPath(rawUrl: string, filename: string, expiresAtSec: number, secret: string): string {
  const sig = signDownload(rawUrl, filename, expiresAtSec, secret)
  const params = new URLSearchParams({ url: rawUrl, name: filename, exp: String(expiresAtSec), sig })
  return `/api/download?${params.toString()}`
}

export type VerifyResult = 'ok' | 'expired' | 'bad_signature' | 'bad_url'

export function verifyDownload(
  rawUrl: string,
  filename: string,
  expiresAtSec: number,
  sig: string,
  secret: string,
  nowSec: number,
): VerifyResult {
  let parsed: URL
  try {
    parsed = new URL(rawUrl)
  } catch {
    return 'bad_url'
  }
  if (parsed.protocol !== 'https:' || parsed.hostname !== ALLOWED_HOST) return 'bad_url'
  const expected = Buffer.from(signDownload(rawUrl, filename, expiresAtSec, secret), 'hex')
  const provided = Buffer.from(sig, 'hex')
  if (expected.length !== provided.length || !timingSafeEqual(expected, provided)) return 'bad_signature'
  if (expiresAtSec < nowSec) return 'expired'
  return 'ok'
}
```

- [ ] **Step 5: Write `lib/auth.ts`**

```ts
export function isValidAccessKey(header: string | null, accessKeysEnv: string | undefined): boolean {
  if (!header || !accessKeysEnv) return false
  const candidate = header.trim()
  if (!candidate) return false
  return accessKeysEnv
    .split(',')
    .map((key) => key.trim())
    .filter(Boolean)
    .includes(candidate)
}
```

- [ ] **Step 6: Run tests to verify they pass**

```bash
pnpm --filter guoba-stream exec vitest run lib/sign.test.ts lib/auth.test.ts
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add apps/guoba-stream/lib
git commit -m "feat(guoba-stream): HMAC download signing and access-key check"
```

---

### Task 5: Resolve endpoint (`api/resolve.ts`)

Web-standard Vercel function. Contract: `GET /api/resolve?ping=1` → 204 (key check only); `GET /api/resolve?url=<link>` → `{tweet: ResolvedTweet}` with `downloadUrl` filled on every variant, or `{error: code}` with status 400/404/502; missing/wrong `X-Access-Key` header → 401 always.

**Files:**
- Create: `apps/guoba-stream/api/resolve.ts`
- Test: `apps/guoba-stream/api/resolve.test.ts`

- [ ] **Step 1: Write the failing test `api/resolve.test.ts`**

```ts
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import videoTweet from '../lib/fixtures/video-tweet.json'
import { verifyDownload } from '../lib/sign'
import type { ResolvedTweet } from '../lib/types'
import { GET } from './resolve'

const KEY = 'friend-key'
const SECRET = 'test-secret'

function makeRequest(query: string, key?: string): Request {
  return new Request(`http://localhost/api/resolve${query}`, {
    headers: key ? { 'x-access-key': key } : {},
  })
}

function hasTweet(value: unknown): value is { tweet: ResolvedTweet } {
  return typeof value === 'object' && value !== null && 'tweet' in value
}

beforeEach(() => {
  vi.stubEnv('ACCESS_KEYS', ` ${KEY} , other-key`)
  vi.stubEnv('DOWNLOAD_SIGNING_SECRET', SECRET)
})

afterEach(() => {
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
})

describe('GET /api/resolve', () => {
  it('rejects a missing or wrong access key with 401', async () => {
    expect((await GET(makeRequest('?ping=1'))).status).toBe(401)
    expect((await GET(makeRequest('?ping=1', 'wrong'))).status).toBe(401)
  })

  it('answers ping with 204 for a valid key', async () => {
    expect((await GET(makeRequest('?ping=1', KEY))).status).toBe(204)
  })

  it('answers ping even when the signing secret is missing', async () => {
    vi.stubEnv('DOWNLOAD_SIGNING_SECRET', '')
    expect((await GET(makeRequest('?ping=1', KEY))).status).toBe(204)
  })

  it('rejects non-tweet urls with invalid_link', async () => {
    const res = await GET(makeRequest(`?url=${encodeURIComponent('https://example.com/x')}`, KEY))
    expect(res.status).toBe(400)
    expect(await res.json()).toEqual({ error: 'invalid_link' })
  })

  it('maps a tombstone to restricted', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json({ __typename: 'TweetTombstone' })))
    const res = await GET(makeRequest(`?url=${encodeURIComponent('https://x.com/a/status/1')}`, KEY))
    expect(res.status).toBe(404)
    expect(await res.json()).toEqual({ error: 'restricted' })
  })

  it('maps syndication 400 to invalid_link and other failures to upstream', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('bad', { status: 400 })))
    expect((await GET(makeRequest(`?url=${encodeURIComponent('https://x.com/a/status/1')}`, KEY))).status).toBe(400)
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('down', { status: 503 })))
    expect((await GET(makeRequest(`?url=${encodeURIComponent('https://x.com/a/status/1')}`, KEY))).status).toBe(502)
  })

  it('maps t.co network failures to upstream', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('fetch failed')))
    const res = await GET(makeRequest(`?url=${encodeURIComponent('https://t.co/abc')}`, KEY))
    expect(res.status).toBe(502)
    expect(await res.json()).toEqual({ error: 'upstream' })
  })

  it('maps malformed upstream payloads to upstream', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        Response.json({ __typename: 'Tweet', mediaDetails: [{ type: 'video', media_url_https: 'x', video_info: {} }] }),
      ),
    )
    const res = await GET(makeRequest(`?url=${encodeURIComponent('https://x.com/a/status/1')}`, KEY))
    expect(res.status).toBe(502)
    expect(await res.json()).toEqual({ error: 'upstream' })
  })

  it('maps syndication network failures to upstream', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('fetch failed')))
    const res = await GET(makeRequest(`?url=${encodeURIComponent('https://x.com/a/status/1')}`, KEY))
    expect(res.status).toBe(502)
    expect(await res.json()).toEqual({ error: 'upstream' })
  })

  it('returns the tweet with signed download urls and filenames', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json(videoTweet)))
    const res = await GET(
      makeRequest(`?url=${encodeURIComponent('https://x.com/elonmusk/status/1585341984679469056?s=46')}`, KEY),
    )
    expect(res.status).toBe(200)
    const body = await res.json()
    if (!hasTweet(body)) throw new Error('expected tweet in response body')
    const variant = body.tweet.media[0].variants[0]
    expect(variant.label).toBe('1080p')
    const params = new URL(`http://x${variant.downloadUrl}`).searchParams
    expect(params.get('name')).toBe('elonmusk_1585341984679469056.mp4')
    expect(
      verifyDownload(
        params.get('url')!,
        params.get('name')!,
        Number(params.get('exp')),
        params.get('sig')!,
        SECRET,
        Math.floor(Date.now() / 1000),
      ),
    ).toBe('ok')
  })

  it('sanitizes hostile author handles out of filenames', async () => {
    const hostile = { ...videoTweet, user: { ...videoTweet.user, screen_name: 'evil"\r\n;handle' } }
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json(hostile)))
    const res = await GET(makeRequest(`?url=${encodeURIComponent('https://x.com/a/status/1585341984679469056')}`, KEY))
    const body = await res.json()
    if (!hasTweet(body)) throw new Error('expected tweet in response body')
    const params = new URL(`http://x${body.tweet.media[0].variants[0].downloadUrl}`).searchParams
    expect(params.get('name')).toBe('evilhandle_1585341984679469056.mp4')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
pnpm --filter guoba-stream exec vitest run api/resolve.test.ts
```

Expected: FAIL — cannot resolve `./resolve`.

- [ ] **Step 3: Write `api/resolve.ts`**

```ts
import { isValidAccessKey } from '../lib/auth'
import { buildDownloadPath } from '../lib/sign'
import { mapTweetResult, syndicationUrl, type RawTweetResult } from '../lib/syndication'
import { resolveTweetId } from '../lib/tweet-url'
import type { ResolveErrorCode } from '../lib/types'

const SIGNATURE_TTL_SEC = 60 * 60

function jsonError(code: ResolveErrorCode, status: number): Response {
  return Response.json({ error: code }, { status })
}

// Sound shallow guard: every RawTweetResult field is optional, so any non-null
// object satisfies the type. Needed because undici types Response.json() as
// Promise<unknown> and oxlint forbids `as` narrowing.
function isRawTweetResult(value: unknown): value is RawTweetResult {
  return typeof value === 'object' && value !== null
}

export async function GET(request: Request): Promise<Response> {
  if (!isValidAccessKey(request.headers.get('x-access-key'), process.env.ACCESS_KEYS)) {
    return Response.json({ error: 'unauthorized' }, { status: 401 })
  }
  const params = new URL(request.url).searchParams
  if (params.get('ping') === '1') return new Response(null, { status: 204 })

  const secret = process.env.DOWNLOAD_SIGNING_SECRET
  if (!secret) return jsonError('upstream', 500)

  let tweetId: string | null
  try {
    tweetId = await resolveTweetId(params.get('url') ?? '')
  } catch {
    return jsonError('upstream', 502)
  }
  if (!tweetId) return jsonError('invalid_link', 400)

  let upstream: Response
  try {
    upstream = await fetch(syndicationUrl(tweetId), { headers: { 'user-agent': 'Mozilla/5.0' } })
  } catch {
    return jsonError('upstream', 502)
  }
  // Syndication 400 = malformed id, 404 = well-formed but nonexistent id — both mean "check your
  // link". Deleted/restricted tweets arrive as 200 + TweetTombstone, handled below as 'restricted'.
  if (upstream.status === 400 || upstream.status === 404) return jsonError('invalid_link', 400)
  if (!upstream.ok) return jsonError('upstream', 502)

  let mapped: ReturnType<typeof mapTweetResult>
  try {
    const raw = await upstream.json()
    if (!isRawTweetResult(raw)) return jsonError('upstream', 502)
    mapped = mapTweetResult(raw)
  } catch {
    return jsonError('upstream', 502)
  }
  if (!mapped.ok) return jsonError(mapped.reason, 404)

  const expiresAtSec = Math.floor(Date.now() / 1000) + SIGNATURE_TTL_SEC
  const { tweet } = mapped
  for (const media of tweet.media) {
    const suffix = tweet.media.length > 1 ? `_${media.index + 1}` : ''
    // Handle/id come from unvalidated upstream JSON; keep filenames header-safe.
    const filename = `${tweet.authorHandle}_${tweet.id}${suffix}.mp4`.replaceAll(/[^\w.-]/g, '')
    for (const variant of media.variants) {
      variant.downloadUrl = buildDownloadPath(variant.rawUrl, filename, expiresAtSec, secret)
    }
  }
  return Response.json({ tweet })
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
pnpm --filter guoba-stream exec vitest run api/resolve.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/guoba-stream/api
git commit -m "feat(guoba-stream): resolve endpoint with auth, syndication fetch and signed links"
```

---

### Task 6: Download proxy endpoint (`api/download.ts`)

Contract: `GET /api/download?url&name&exp&sig` → verifies signature (no access key needed — the signature IS the authorization, because `<a>` navigation can't send headers), streams from `video.twimg.com` with `Content-Disposition: attachment`. 410 for expired (frontend hint: re-fetch), 403 for anything tampered.

**Files:**
- Create: `apps/guoba-stream/api/download.ts`
- Test: `apps/guoba-stream/api/download.test.ts`

- [ ] **Step 1: Write the failing test `api/download.test.ts`**

```ts
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { buildDownloadPath } from '../lib/sign'
import { GET } from './download'

const SECRET = 'test-secret'
const RAW = 'https://video.twimg.com/ext_tw_video/1/pu/vid/1280x720/abc.mp4?tag=14'

const futureExp = () => Math.floor(Date.now() / 1000) + 600

beforeEach(() => {
  vi.stubEnv('DOWNLOAD_SIGNING_SECRET', SECRET)
})

afterEach(() => {
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
})

describe('GET /api/download', () => {
  it('streams the upstream body with attachment and length headers', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response('video-bytes', { headers: { 'content-type': 'video/mp4', 'content-length': '11' } }),
      ),
    )
    const path = buildDownloadPath(RAW, 'a_1.mp4', futureExp(), SECRET)
    const res = await GET(new Request(`http://localhost${path}`))
    expect(res.status).toBe(200)
    expect(res.headers.get('content-disposition')).toBe('attachment; filename="a_1.mp4"')
    expect(res.headers.get('content-type')).toBe('video/mp4')
    expect(res.headers.get('content-length')).toBe('11')
    expect(await res.text()).toBe('video-bytes')
  })

  it('rejects tampered params with 403 and never fetches upstream', async () => {
    const fetchSpy = vi.fn()
    vi.stubGlobal('fetch', fetchSpy)
    const path = buildDownloadPath(RAW, 'a_1.mp4', futureExp(), SECRET)
    const res = await GET(new Request(`http://localhost${path.replace('a_1.mp4', 'b.mp4')}`))
    expect(res.status).toBe(403)
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('rejects expired links with 410', async () => {
    const past = Math.floor(Date.now() / 1000) - 10
    const path = buildDownloadPath(RAW, 'a_1.mp4', past, SECRET)
    const res = await GET(new Request(`http://localhost${path}`))
    expect(res.status).toBe(410)
  })

  it('maps upstream failure to 502', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, { status: 404 })))
    const path = buildDownloadPath(RAW, 'a_1.mp4', futureExp(), SECRET)
    const res = await GET(new Request(`http://localhost${path}`))
    expect(res.status).toBe(502)
  })

  it('maps upstream network errors to 502', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('fetch failed')))
    const path = buildDownloadPath(RAW, 'a_1.mp4', futureExp(), SECRET)
    const res = await GET(new Request(`http://localhost${path}`))
    expect(res.status).toBe(502)
  })

  it('rejects header-breaking filenames even with a valid signature', async () => {
    const fetchSpy = vi.fn()
    vi.stubGlobal('fetch', fetchSpy)
    const path = buildDownloadPath(RAW, 'a".mp4', futureExp(), SECRET)
    const res = await GET(new Request(`http://localhost${path}`))
    expect(res.status).toBe(403)
    expect(fetchSpy).not.toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
pnpm --filter guoba-stream exec vitest run api/download.test.ts
```

Expected: FAIL — cannot resolve `./download`.

- [ ] **Step 3: Write `api/download.ts`**

```ts
import { verifyDownload } from '../lib/sign'

export const maxDuration = 60

export async function GET(request: Request): Promise<Response> {
  const params = new URL(request.url).searchParams
  const rawUrl = params.get('url') ?? ''
  const name = params.get('name') ?? 'video.mp4'
  const exp = Number(params.get('exp') ?? '0')
  const sig = params.get('sig') ?? ''
  // Signed names are already sanitized by resolve; this guards the Headers constructor
  // against anything else (quotes/CRLF in filename would throw or inject parameters).
  if (!/^[\w.-]+$/.test(name)) return new Response('Invalid download link', { status: 403 })
  const secret = process.env.DOWNLOAD_SIGNING_SECRET
  if (!secret) return new Response('Server misconfigured', { status: 500 })

  const verdict = verifyDownload(rawUrl, name, exp, sig, secret, Math.floor(Date.now() / 1000))
  if (verdict === 'expired') return new Response('Link expired — fetch the post again', { status: 410 })
  if (verdict !== 'ok') return new Response('Invalid download link', { status: 403 })

  let upstream: Response
  try {
    upstream = await fetch(rawUrl)
  } catch {
    return new Response('Upstream fetch failed', { status: 502 })
  }
  if (!upstream.ok || !upstream.body) return new Response('Upstream fetch failed', { status: 502 })

  const headers = new Headers({
    'content-type': upstream.headers.get('content-type') ?? 'video/mp4',
    'content-disposition': `attachment; filename="${name}"`,
    'cache-control': 'private, max-age=0',
  })
  const length = upstream.headers.get('content-length')
  if (length) headers.set('content-length', length)
  return new Response(upstream.body, { headers })
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
pnpm --filter guoba-stream exec vitest run api/download.test.ts
```

Expected: PASS.

- [ ] **Step 5: Run the full unit suite + lint**

```bash
pnpm --filter guoba-stream test
pnpm --filter guoba-stream lint
```

Expected: all green, 0 warnings.

- [ ] **Step 6: Commit**

```bash
git add apps/guoba-stream/api
git commit -m "feat(guoba-stream): signed streaming download proxy"
```

---

### Task 7: Local dev bridge for `api/` (`dev-api-plugin.ts`)

`vite dev` doesn't know about Vercel functions. This tiny plugin mounts the same web handlers under `/api/*` in dev only, so the `pnpm dev` + browser loop works end-to-end locally (including real syndication calls). It is NOT used by `vite preview`/e2e (e2e mocks `/api/*`).

**Files:**
- Create: `apps/guoba-stream/dev-api-plugin.ts`, `apps/guoba-stream/.env.local` (gitignored)
- Modify: `apps/guoba-stream/vite.config.ts`

- [ ] **Step 1: Write `apps/guoba-stream/dev-api-plugin.ts`**

```ts
import type { IncomingMessage, ServerResponse } from 'node:http'

import type { Plugin } from 'vite'

type WebHandler = (request: Request) => Promise<Response>

function toRequest(req: IncomingMessage): Request {
  const url = `http://${req.headers.host ?? 'localhost'}/api${req.url ?? '/'}`
  const headers = new Headers()
  for (const [key, value] of Object.entries(req.headers)) {
    if (typeof value === 'string') headers.set(key, value)
  }
  return new Request(url, { method: req.method, headers })
}

async function sendResponse(res: ServerResponse, response: Response): Promise<void> {
  res.statusCode = response.status
  response.headers.forEach((value, key) => res.setHeader(key, value))
  if (response.body) {
    for await (const chunk of response.body) res.write(chunk)
  }
  res.end()
}

function hasGetHandler(mod: object): mod is { GET: WebHandler } {
  return 'GET' in mod && typeof (mod as { GET?: unknown }).GET === 'function'
}

export function devApiPlugin(): Plugin {
  return {
    name: 'guoba-dev-api',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use('/api', (req, res, next) => {
        const name = (req.url ?? '').split('?')[0].replaceAll('/', '')
        if (name !== 'resolve' && name !== 'download') {
          next()
          return
        }
        server
          .ssrLoadModule(`/api/${name}.ts`)
          .then((mod) => {
            if (!hasGetHandler(mod)) throw new Error(`No GET handler in /api/${name}.ts`)
            return mod.GET(toRequest(req))
          })
          .then((response) => sendResponse(res, response))
          .catch((error: unknown) => {
            res.statusCode = 500
            res.end(String(error))
          })
      })
    },
  }
}
```

- [ ] **Step 2: Update `apps/guoba-stream/vite.config.ts`** (full replacement — adds env loading + plugin)

```ts
import process from 'node:process'

import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { loadEnv } from 'vite'
import { defineConfig } from 'vitest/config'

import { devApiPlugin } from './dev-api-plugin'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  process.env.ACCESS_KEYS ??= env.ACCESS_KEYS
  process.env.DOWNLOAD_SIGNING_SECRET ??= env.DOWNLOAD_SIGNING_SECRET
  return {
    plugins: [tailwindcss(), react(), devApiPlugin()],
    test: {
      environment: 'node',
      include: ['lib/**/*.test.ts', 'api/**/*.test.ts', 'src/**/*.test.ts'],
    },
  }
})
```

- [ ] **Step 3: Create `apps/guoba-stream/.env.local`** (never committed; `.gitignore` already covers it)

```
ACCESS_KEYS=dev-key
DOWNLOAD_SIGNING_SECRET=dev-secret-only-for-local
```

- [ ] **Step 4: Smoke test the dev bridge with curl**

```bash
pnpm --filter guoba-stream dev &
sleep 3
curl -s -o /dev/null -w "%{http_code}\n" "http://localhost:5173/api/resolve?ping=1"                             # expect 401
curl -s -o /dev/null -w "%{http_code}\n" -H "x-access-key: dev-key" "http://localhost:5173/api/resolve?ping=1"  # expect 204
curl -s -H "x-access-key: dev-key" "http://localhost:5173/api/resolve?url=https%3A%2F%2Fx.com%2Felonmusk%2Fstatus%2F1585341984679469056" | head -c 400
# expect JSON starting {"tweet":{"id":"1585341984679469056",... (live syndication call)
kill %1
```

- [ ] **Step 5: Verify build still passes (plugin must not leak into build)**

```bash
pnpm --filter guoba-stream build
```

Expected: success.

- [ ] **Step 6: Commit**

```bash
git add apps/guoba-stream/dev-api-plugin.ts apps/guoba-stream/vite.config.ts
git commit -m "feat(guoba-stream): dev-server bridge for api handlers"
```

---

### Task 8: Frontend — access gate + app shell

**Files:**
- Create: `src/lib/access-key.ts`, `src/lib/api.ts`, `src/components/gate.tsx`
- Modify: `src/app.tsx`

- [ ] **Step 1: Write `src/lib/access-key.ts`**

```ts
const STORAGE_KEY = 'guoba-stream:access-key'

export function loadAccessKey(): string | null {
  return localStorage.getItem(STORAGE_KEY)
}

export function saveAccessKey(key: string): void {
  localStorage.setItem(STORAGE_KEY, key)
}

export function clearAccessKey(): void {
  localStorage.removeItem(STORAGE_KEY)
}
```

- [ ] **Step 2: Write `src/lib/api.ts`**

```ts
import type { ResolvedTweet, ResolveErrorCode } from '../../lib/types'

export type ResolveOutcome =
  | { status: 'ok'; tweet: ResolvedTweet }
  | { status: 'error'; code: ResolveErrorCode }
  | { status: 'unauthorized' }

export async function pingAccessKey(key: string): Promise<boolean> {
  try {
    const res = await fetch('/api/resolve?ping=1', { headers: { 'x-access-key': key } })
    return res.status === 204
  } catch {
    return false
  }
}

export async function resolveTweet(url: string, key: string): Promise<ResolveOutcome> {
  let res: Response
  try {
    res = await fetch(`/api/resolve?url=${encodeURIComponent(url)}`, { headers: { 'x-access-key': key } })
  } catch {
    return { status: 'error', code: 'upstream' }
  }
  if (res.status === 401) return { status: 'unauthorized' }
  const body: { tweet?: ResolvedTweet; error?: ResolveErrorCode } | null = await res.json().catch(() => null)
  if (res.ok && body?.tweet) return { status: 'ok', tweet: body.tweet }
  return { status: 'error', code: body?.error ?? 'upstream' }
}
```

- [ ] **Step 3: Write `src/components/gate.tsx`**

```tsx
import { Flame, KeyRound } from 'lucide-react'
import { useState } from 'react'

import { pingAccessKey } from '../lib/api'

export function Gate({ onUnlocked }: { onUnlocked: (key: string) => void }) {
  const [value, setValue] = useState('')
  const [checking, setChecking] = useState(false)
  const [failed, setFailed] = useState(false)

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    const key = value.trim()
    if (!key || checking) return
    setChecking(true)
    setFailed(false)
    const ok = await pingAccessKey(key)
    setChecking(false)
    if (ok) onUnlocked(key)
    else setFailed(true)
  }

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-6 text-center">
      <div className="flex items-center gap-2">
        <Flame className="size-6 text-ember" aria-hidden />
        <span className="font-display text-3xl font-semibold">
          guoba<span className="text-ember">stream</span>
        </span>
      </div>
      <p className="mt-2 text-xs text-bran">tweet videos, saved crispy</p>
      <form onSubmit={(e) => void submit(e)} className="mt-8 flex w-full max-w-sm gap-2">
        <label className="flex flex-1 items-center gap-2 rounded-lg border border-seam bg-pan px-3">
          <KeyRound className="size-4 shrink-0 text-bran" aria-hidden />
          <input
            type="password"
            autoFocus
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="Access code"
            className="h-11 w-full bg-transparent text-base outline-none placeholder:text-bran"
          />
        </label>
        <button type="submit" disabled={checking} className="h-11 rounded-lg bg-ember px-5 font-medium text-ember-ink">
          {checking ? 'Checking…' : 'Unlock'}
        </button>
      </form>
      {failed && <p className="mt-3 text-sm text-red-400">That code didn&apos;t work</p>}
      <p className="mt-6 text-xs text-faint">Invite-only. Codes are issued personally.</p>
    </main>
  )
}
```

- [ ] **Step 4: Replace `src/app.tsx`** (gate wiring only; resolve flow lands in Task 9)

```tsx
import { Flame } from 'lucide-react'
import { useState } from 'react'

import { Gate } from './components/gate'
import { loadAccessKey, saveAccessKey } from './lib/access-key'

export function App() {
  const [accessKey, setAccessKey] = useState<string | null>(() => loadAccessKey())

  if (!accessKey) {
    return (
      <Gate
        onUnlocked={(key) => {
          saveAccessKey(key)
          setAccessKey(key)
        }}
      />
    )
  }

  return (
    <div className="mx-auto flex min-h-dvh max-w-3xl flex-col px-4 pt-6">
      <header className="mb-5 flex items-center gap-2">
        <Flame className="size-5 text-ember" aria-hidden />
        <span className="font-display text-xl font-semibold">
          guoba<span className="text-ember">stream</span>
        </span>
      </header>
    </div>
  )
}
```

- [ ] **Step 5: Verify manually**

```bash
pnpm --filter guoba-stream dev
```

Open http://localhost:5173 — gate shows; wrong code → "That code didn't work"; `dev-key` → main shell with wordmark. Check `localStorage['guoba-stream:access-key']` is set; reload skips the gate.

- [ ] **Step 6: Lint + commit**

```bash
pnpm --filter guoba-stream lint
git add apps/guoba-stream/src
git commit -m "feat(guoba-stream): access gate with key persistence"
```

---

### Task 9: Frontend — URL form, resolve flow, error banners

**Files:**
- Create: `src/components/url-form.tsx`, `src/components/error-banner.tsx`
- Modify: `src/app.tsx`

- [ ] **Step 1: Write `src/components/url-form.tsx`**

```tsx
import { Link2, LoaderCircle, ShieldCheck } from 'lucide-react'
import { useState } from 'react'

export function UrlForm({ loading, onSubmit }: { loading: boolean; onSubmit: (url: string) => void }) {
  const [value, setValue] = useState('')

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        if (value.trim() && !loading) onSubmit(value.trim())
      }}
    >
      <div className="flex gap-2">
        <label className="flex flex-1 items-center gap-2 rounded-lg border border-seam bg-pan px-3">
          <Link2 className="size-4 shrink-0 text-bran" aria-hidden />
          <input
            type="url"
            inputMode="url"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="https://x.com/…/status/…"
            className="h-11 w-full bg-transparent text-base outline-none placeholder:text-bran"
          />
        </label>
        <button
          type="submit"
          disabled={loading}
          className="flex h-11 items-center gap-1.5 rounded-lg bg-ember px-4 font-medium text-ember-ink"
        >
          {loading && <LoaderCircle className="size-4 animate-spin" aria-hidden />}
          Fetch
        </button>
      </div>
      <p className="mt-2 flex items-center gap-1.5 text-xs text-faint">
        <ShieldCheck className="size-3.5 shrink-0" aria-hidden />
        Tracking params are stripped automatically
      </p>
    </form>
  )
}
```

- [ ] **Step 2: Write `src/components/error-banner.tsx`**

```tsx
import { CircleAlert } from 'lucide-react'

import type { ResolveErrorCode } from '../../lib/types'

const MESSAGES: Record<ResolveErrorCode, string> = {
  invalid_link: "That doesn't look like a post link",
  restricted: "This post is restricted or deleted — can't fetch it",
  no_video: 'No videos in this post',
  upstream: "X's API hiccuped — try again",
}

export function ErrorBanner({ code }: { code: ResolveErrorCode }) {
  return (
    <p className="mt-4 flex items-center gap-2 rounded-lg border border-red-900/60 bg-red-950/40 px-3 py-2.5 text-sm text-red-300">
      <CircleAlert className="size-4 shrink-0" aria-hidden />
      {MESSAGES[code]}
    </p>
  )
}
```

- [ ] **Step 3: Update `src/app.tsx`** (full replacement — resolve flow, still no media cards)

```tsx
import { Flame } from 'lucide-react'
import { useState } from 'react'

import type { ResolvedTweet, ResolveErrorCode } from '../lib/types'
import { ErrorBanner } from './components/error-banner'
import { Gate } from './components/gate'
import { UrlForm } from './components/url-form'
import { clearAccessKey, loadAccessKey, saveAccessKey } from './lib/access-key'
import { resolveTweet } from './lib/api'

export function App() {
  const [accessKey, setAccessKey] = useState<string | null>(() => loadAccessKey())
  const [tweet, setTweet] = useState<ResolvedTweet | null>(null)
  const [errorCode, setErrorCode] = useState<ResolveErrorCode | null>(null)
  const [loading, setLoading] = useState(false)

  if (!accessKey) {
    return (
      <Gate
        onUnlocked={(key) => {
          saveAccessKey(key)
          setAccessKey(key)
        }}
      />
    )
  }

  const handleFetch = async (url: string) => {
    setLoading(true)
    setErrorCode(null)
    setTweet(null)
    const outcome = await resolveTweet(url, accessKey)
    setLoading(false)
    if (outcome.status === 'unauthorized') {
      clearAccessKey()
      setAccessKey(null)
      return
    }
    if (outcome.status === 'error') {
      setErrorCode(outcome.code)
      return
    }
    setTweet(outcome.tweet)
  }

  return (
    <div className="mx-auto flex min-h-dvh max-w-3xl flex-col px-4 pt-6">
      <header className="mb-5 flex items-center gap-2">
        <Flame className="size-5 text-ember" aria-hidden />
        <span className="font-display text-xl font-semibold">
          guoba<span className="text-ember">stream</span>
        </span>
      </header>
      <UrlForm loading={loading} onSubmit={(url) => void handleFetch(url)} />
      {errorCode && <ErrorBanner code={errorCode} />}
      {tweet && <p className="mt-4 text-sm text-husk">@{tweet.authorHandle} — media cards land next</p>}
    </div>
  )
}
```

- [ ] **Step 4: Verify manually against the live dev bridge**

With `pnpm --filter guoba-stream dev` running: paste `https://x.com/elonmusk/status/1585341984679469056` → placeholder line with `@elonmusk` appears. Paste `https://example.com/x` → invalid-link banner. Paste a deleted tweet (`https://x.com/a/status/1263145271946551300`) → restricted banner.

- [ ] **Step 5: Lint + commit**

```bash
pnpm --filter guoba-stream lint
git add apps/guoba-stream/src
git commit -m "feat(guoba-stream): url form with resolve flow and error banners"
```

---

### Task 10: Frontend — tweet card, media cards, selection, batch download

**Files:**
- Create: `src/lib/format.ts`, `src/lib/format.test.ts`, `src/lib/download.ts`, `src/components/tweet-card.tsx`, `src/components/media-card.tsx`, `src/components/download-bar.tsx`
- Modify: `src/app.tsx`

- [ ] **Step 1: Write the failing test `src/lib/format.test.ts`**

```ts
import { describe, expect, it } from 'vitest'

import { formatDuration } from './format'

describe('formatDuration', () => {
  it('formats milliseconds as m:ss', () => {
    expect(formatDuration(9301)).toBe('0:09')
    expect(formatDuration(75000)).toBe('1:15')
    expect(formatDuration(600000)).toBe('10:00')
  })
})
```

- [ ] **Step 2: Run it, verify FAIL, then write `src/lib/format.ts`**

```bash
pnpm --filter guoba-stream exec vitest run src/lib/format.test.ts
```

```ts
export function formatDuration(ms: number): string {
  const totalSeconds = Math.round(ms / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes}:${String(seconds).padStart(2, '0')}`
}
```

Re-run — expect PASS.

- [ ] **Step 3: Write `src/lib/download.ts`**

```ts
export function triggerDownload(href: string): void {
  const anchor = document.createElement('a')
  anchor.href = href
  anchor.rel = 'noopener'
  document.body.append(anchor)
  anchor.click()
  anchor.remove()
}

export async function downloadSequentially(hrefs: string[], delayMs = 500): Promise<void> {
  for (const [index, href] of hrefs.entries()) {
    // oxlint-disable-next-line no-await-in-loop -- sequential throttling is the point: spacing downloads dodges browser multi-download blocking
    if (index > 0) await new Promise((resolve) => setTimeout(resolve, delayMs))
    triggerDownload(href)
  }
}
```

- [ ] **Step 4: Write `src/components/tweet-card.tsx`**

```tsx
import type { ResolvedTweet } from '../../lib/types'

export function TweetCard({ tweet }: { tweet: ResolvedTweet }) {
  return (
    <section className="my-4 rounded-xl border border-crust bg-pan p-3.5">
      <div className="flex items-start gap-2.5">
        <img src={tweet.avatarUrl} alt="" referrerPolicy="no-referrer" className="size-9 rounded-full bg-crust" />
        <div className="min-w-0">
          <p className="text-sm font-medium">
            {tweet.authorName} <span className="font-normal text-bran">@{tweet.authorHandle}</span>
          </p>
          <p className="mt-0.5 text-sm break-words text-husk">{tweet.text}</p>
        </div>
      </div>
    </section>
  )
}
```

- [ ] **Step 5: Write `src/components/media-card.tsx`**

```tsx
import { Check, Download, ExternalLink, Play } from 'lucide-react'
import { useState } from 'react'

import type { MediaItem } from '../../lib/types'
import { formatDuration } from '../lib/format'

interface MediaCardProps {
  media: MediaItem
  selected: boolean
  variantIndex: number
  onToggleSelected: () => void
  onVariantChange: (index: number) => void
}

export function MediaCard({ media, selected, variantIndex, onToggleSelected, onVariantChange }: MediaCardProps) {
  const [playing, setPlaying] = useState(false)
  const variant = media.variants[variantIndex] ?? media.variants[0]

  return (
    <article className="overflow-hidden rounded-xl border border-crust bg-pan">
      <div className="relative aspect-video bg-pan-deep">
        {playing ? (
          <video
            key={variant.rawUrl}
            src={variant.rawUrl}
            poster={media.thumbnailUrl}
            controls
            autoPlay
            playsInline
            loop={media.kind === 'gif'}
            className="h-full w-full"
          />
        ) : (
          <button type="button" onClick={() => setPlaying(true)} aria-label="Play preview" className="block h-full w-full">
            <img src={media.thumbnailUrl} alt="" referrerPolicy="no-referrer" className="h-full w-full object-cover" />
            <span className="absolute inset-0 m-auto flex size-11 items-center justify-center rounded-full bg-ember">
              <Play className="size-5 text-ember-ink" aria-hidden />
            </span>
          </button>
        )}
        <button
          type="button"
          onClick={onToggleSelected}
          aria-pressed={selected}
          aria-label={selected ? 'Deselect' : 'Select'}
          className={`absolute top-2 left-2 flex size-8 items-center justify-center rounded-md ${
            selected ? 'bg-ember' : 'border-2 border-seam-strong bg-pan-deep/70'
          }`}
        >
          {selected && <Check className="size-4 text-ember-ink" aria-hidden />}
        </button>
        {media.kind === 'gif' && (
          <span className="absolute top-2 right-2 rounded-md bg-crust px-2 py-0.5 text-xs font-medium text-ember-soft">
            GIF
          </span>
        )}
        {media.durationMs !== null && !playing && (
          <span className="absolute right-2 bottom-2 rounded-md bg-pan-deep/90 px-2 py-0.5 text-xs text-husk">
            {formatDuration(media.durationMs)}
          </span>
        )}
      </div>
      <div className="flex items-center gap-2 p-2.5">
        {media.variants.length > 1 ? (
          <select
            value={variantIndex}
            onChange={(e) => onVariantChange(Number(e.target.value))}
            aria-label="Quality"
            className="h-9 rounded-md border border-seam bg-pan px-2 text-sm"
          >
            {media.variants.map((option, index) => (
              <option key={option.rawUrl} value={index}>
                {option.label}
              </option>
            ))}
          </select>
        ) : (
          <span className="px-1 text-sm text-bran">{variant.label}</span>
        )}
        <span className="flex-1" />
        <a
          href={variant.rawUrl}
          target="_blank"
          rel="noreferrer noopener"
          aria-label="Open raw link"
          className="flex size-9 items-center justify-center rounded-md border border-seam text-bran"
        >
          <ExternalLink className="size-4" aria-hidden />
        </a>
        <a
          href={variant.downloadUrl}
          download
          className="flex h-9 items-center gap-1.5 rounded-md bg-ember px-3 text-sm font-medium text-ember-ink"
        >
          <Download className="size-4" aria-hidden />
          Save
        </a>
      </div>
    </article>
  )
}
```

- [ ] **Step 6: Write `src/components/download-bar.tsx`**

```tsx
import { Download } from 'lucide-react'

interface DownloadBarProps {
  total: number
  selectedCount: number
  onDownload: () => void
}

export function DownloadBar({ total, selectedCount, onDownload }: DownloadBarProps) {
  return (
    <div className="fixed inset-x-0 bottom-0 border-t border-crust bg-coal/95 pb-[env(safe-area-inset-bottom)]">
      <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
        <span className="text-sm text-husk">
          {selectedCount} of {total} selected
        </span>
        <button
          type="button"
          onClick={onDownload}
          disabled={selectedCount === 0}
          className="flex h-11 items-center gap-2 rounded-lg bg-ember px-4 font-medium text-ember-ink disabled:opacity-50"
        >
          <Download className="size-4" aria-hidden />
          Download {selectedCount} {selectedCount === 1 ? 'file' : 'files'}
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Step 7: Update `src/app.tsx`** (full replacement — final version)

```tsx
import { Flame } from 'lucide-react'
import { useState } from 'react'

import type { ResolvedTweet, ResolveErrorCode } from '../lib/types'
import { DownloadBar } from './components/download-bar'
import { ErrorBanner } from './components/error-banner'
import { Gate } from './components/gate'
import { MediaCard } from './components/media-card'
import { TweetCard } from './components/tweet-card'
import { UrlForm } from './components/url-form'
import { clearAccessKey, loadAccessKey, saveAccessKey } from './lib/access-key'
import { resolveTweet } from './lib/api'
import { downloadSequentially } from './lib/download'

export function App() {
  const [accessKey, setAccessKey] = useState<string | null>(() => loadAccessKey())
  const [tweet, setTweet] = useState<ResolvedTweet | null>(null)
  const [errorCode, setErrorCode] = useState<ResolveErrorCode | null>(null)
  const [loading, setLoading] = useState(false)
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [variantChoice, setVariantChoice] = useState<Record<number, number>>({})

  if (!accessKey) {
    return (
      <Gate
        onUnlocked={(key) => {
          saveAccessKey(key)
          setAccessKey(key)
        }}
      />
    )
  }

  const handleFetch = async (url: string) => {
    setLoading(true)
    setErrorCode(null)
    setTweet(null)
    const outcome = await resolveTweet(url, accessKey)
    setLoading(false)
    if (outcome.status === 'unauthorized') {
      clearAccessKey()
      setAccessKey(null)
      return
    }
    if (outcome.status === 'error') {
      setErrorCode(outcome.code)
      return
    }
    setTweet(outcome.tweet)
    setSelected(new Set(outcome.tweet.media.map((media) => media.index)))
    setVariantChoice({})
  }

  const toggleSelected = (index: number) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(index)) next.delete(index)
      else next.add(index)
      return next
    })
  }

  const downloadSelected = () => {
    if (!tweet) return
    const hrefs = tweet.media
      .filter((media) => selected.has(media.index))
      .map((media) => media.variants[variantChoice[media.index] ?? 0].downloadUrl)
    void downloadSequentially(hrefs)
  }

  return (
    <div className="mx-auto flex min-h-dvh max-w-3xl flex-col px-4 pt-6">
      <header className="mb-5 flex items-center gap-2">
        <Flame className="size-5 text-ember" aria-hidden />
        <span className="font-display text-xl font-semibold">
          guoba<span className="text-ember">stream</span>
        </span>
      </header>
      <UrlForm loading={loading} onSubmit={(url) => void handleFetch(url)} />
      {errorCode && <ErrorBanner code={errorCode} />}
      {tweet && (
        <>
          <TweetCard tweet={tweet} />
          <div className="grid gap-3 pb-28 sm:grid-cols-2">
            {tweet.media.map((media) => (
              <MediaCard
                key={media.index}
                media={media}
                selected={selected.has(media.index)}
                variantIndex={variantChoice[media.index] ?? 0}
                onToggleSelected={() => toggleSelected(media.index)}
                onVariantChange={(index) => setVariantChoice((prev) => ({ ...prev, [media.index]: index }))}
              />
            ))}
          </div>
          <DownloadBar total={tweet.media.length} selectedCount={selected.size} onDownload={downloadSelected} />
        </>
      )}
    </div>
  )
}
```

- [ ] **Step 8: Verify manually (desktop + mobile viewport)**

With dev server running, resolve `https://x.com/elonmusk/status/1585341984679469056`:
- Tweet card + one media card with quality select (1080p/720p/270p), duration `0:09`.
- Play → inline video plays (streams straight from video.twimg.com).
- Save → browser downloads `elonmusk_1585341984679469056.mp4` through `/api/download`.
- Bottom bar: "1 of 1 selected" / "Download 1 file".
- In devtools mobile emulation (iPhone): single-column card, bar sticks to bottom, no zoom on input focus.

- [ ] **Step 9: Full checks + commit**

```bash
pnpm --filter guoba-stream test
pnpm --filter guoba-stream lint
pnpm --filter guoba-stream build
git add apps/guoba-stream/src
git commit -m "feat(guoba-stream): media cards with preview, quality select and batch download"
```

---

### Task 11: Playwright e2e (desktop + mobile)

e2e runs against `vite preview` (built bundle, no api bridge) with all `/api/*` routes mocked in Playwright — deterministic, no live X calls in CI.

**Files:**
- Create: `apps/guoba-stream/playwright.config.ts`, `e2e/fixtures.ts`, `e2e/app.spec.ts`

- [ ] **Step 1: Write `apps/guoba-stream/playwright.config.ts`** (qr-vault pattern + mobile webkit project)

```ts
import process from 'node:process'

import { defineConfig, devices } from '@playwright/test'

const port = 4173
const baseURL = `http://127.0.0.1:${port}`
const isCI = Boolean(process.env.CI)

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: isCI,
  retries: isCI ? 2 : 0,
  workers: isCI ? 1 : undefined,
  reporter: isCI ? [['github'], ['html', { open: 'never' }]] : [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL,
    locale: 'en-US',
    screenshot: 'only-on-failure',
    trace: 'on-first-retry',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile-safari', use: { ...devices['iPhone 13'] } },
  ],
  webServer: {
    command: `pnpm exec vite preview --host 127.0.0.1 --port ${port} --strictPort`,
    url: baseURL,
    reuseExistingServer: !isCI,
  },
})
```

- [ ] **Step 2: Write `e2e/fixtures.ts`**

```ts
export const ACCESS_KEY = 'e2e-key'

const PIXEL = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7'

function variant(label: string, height: number, bitrate: number) {
  const rawUrl = `https://video.twimg.com/ext_tw_video/1/pu/vid/${height * 2}x${height}/v${height}.mp4`
  return {
    label,
    width: height * 2,
    height,
    bitrate,
    rawUrl,
    downloadUrl: `/api/download?url=${encodeURIComponent(rawUrl)}&name=sana_films_1_x.mp4&exp=9999999999&sig=e2e`,
  }
}

export const RESOLVED_TWEET = {
  tweet: {
    id: '1585341984679469056',
    authorName: 'Sana Uchida',
    authorHandle: 'sana_films',
    avatarUrl: PIXEL,
    text: 'Three cuts from the night market shoot',
    media: [
      {
        index: 0,
        kind: 'video',
        thumbnailUrl: PIXEL,
        durationMs: 42000,
        variants: [variant('1080p', 540, 3), variant('720p', 360, 2), variant('270p', 135, 1)],
      },
      {
        index: 1,
        kind: 'video',
        thumbnailUrl: PIXEL,
        durationMs: 75000,
        variants: [variant('720p', 360, 2)],
      },
      {
        index: 2,
        kind: 'gif',
        thumbnailUrl: PIXEL,
        durationMs: null,
        variants: [variant('gif', 240, 0)],
      },
    ],
  },
}
```

- [ ] **Step 3: Write `e2e/app.spec.ts`**

```ts
import { expect, test, type Page } from '@playwright/test'

import { ACCESS_KEY, RESOLVED_TWEET } from './fixtures'

const TWEET_URL = 'https://x.com/sana_films/status/1585341984679469056?s=46&t=track'

async function seedAccessKey(page: Page) {
  await page.addInitScript(
    ([key]) => localStorage.setItem('guoba-stream:access-key', key),
    [ACCESS_KEY],
  )
}

test('gate blocks until a valid code is entered', async ({ page }) => {
  await page.route('**/api/resolve*', (route) => {
    const ok = route.request().headers()['x-access-key'] === ACCESS_KEY
    void route.fulfill(ok ? { status: 204, body: '' } : { status: 401, json: { error: 'unauthorized' } })
  })
  await page.goto('/')
  await page.getByPlaceholder('Access code').fill('wrong')
  await page.getByRole('button', { name: 'Unlock' }).click()
  await expect(page.getByText("That code didn't work")).toBeVisible()
  await page.getByPlaceholder('Access code').fill(ACCESS_KEY)
  await page.getByRole('button', { name: 'Unlock' }).click()
  await expect(page.getByPlaceholder('https://x.com/…/status/…')).toBeVisible()
})

test('resolves a post into selectable media cards', async ({ page }) => {
  await seedAccessKey(page)
  await page.route('**/api/resolve*', (route) => route.fulfill({ json: RESOLVED_TWEET }))
  await page.goto('/')
  await page.getByPlaceholder('https://x.com/…/status/…').fill(TWEET_URL)
  await page.getByRole('button', { name: 'Fetch' }).click()

  await expect(page.getByText('@sana_films')).toBeVisible()
  await expect(page.getByRole('article')).toHaveCount(3)
  await expect(page.getByText('GIF', { exact: true })).toBeVisible()
  await expect(page.getByText('0:42')).toBeVisible()
  await expect(page.getByText('3 of 3 selected')).toBeVisible()

  const quality = page.getByLabel('Quality').first()
  await expect(quality).toHaveValue('0')
  await quality.selectOption('1')
  await expect(page.getByRole('link', { name: 'Open raw link' }).first()).toHaveAttribute('href', /360x180|v360/)

  await page.getByRole('button', { name: 'Deselect' }).first().click()
  await expect(page.getByText('2 of 3 selected')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Download 2 files' })).toBeVisible()

  const save = page.getByRole('link', { name: /Save/ }).first()
  await expect(save).toHaveAttribute('href', /\/api\/download\?/)
})

test('shows a friendly error for restricted posts', async ({ page }) => {
  await seedAccessKey(page)
  await page.route('**/api/resolve*', (route) => route.fulfill({ status: 404, json: { error: 'restricted' } }))
  await page.goto('/')
  await page.getByPlaceholder('https://x.com/…/status/…').fill(TWEET_URL)
  await page.getByRole('button', { name: 'Fetch' }).click()
  await expect(page.getByText("This post is restricted or deleted — can't fetch it")).toBeVisible()
})

test('kicks back to the gate when the key is revoked', async ({ page }) => {
  await seedAccessKey(page)
  await page.route('**/api/resolve*', (route) => route.fulfill({ status: 401, json: { error: 'unauthorized' } }))
  await page.goto('/')
  await page.getByPlaceholder('https://x.com/…/status/…').fill(TWEET_URL)
  await page.getByRole('button', { name: 'Fetch' }).click()
  await expect(page.getByPlaceholder('Access code')).toBeVisible()
})
```

Note: the `Save` control is an `<a>`; `getByRole('link', { name: /Save/ })` matches it. The raw-link `href` assertion uses the fixture URL scheme (`${height*2}x${height}` → `720x360` for the 360-height variant — the regex `/360x180|v360/` covers the `v360.mp4` filename). If the assertion is brittle, assert `toContainText` on the select instead.

- [ ] **Step 4: Run e2e**

```bash
pnpm --filter guoba-stream exec playwright install chromium webkit
pnpm --filter guoba-stream test:e2e
```

Expected: all tests pass on both projects (chromium + iPhone 13 webkit). The mobile project exercises the same specs at 390×844.

- [ ] **Step 5: Commit**

```bash
git add apps/guoba-stream/playwright.config.ts apps/guoba-stream/e2e
git commit -m "test(guoba-stream): e2e coverage for gate, resolve and selection flows"
```

---

### Task 12: CI workflow + docs

**Files:**
- Create: `.github/workflows/guoba-stream-e2e.yml`, `apps/guoba-stream/README.md`, `apps/guoba-stream/DESIGN.md`

- [ ] **Step 1: Write `.github/workflows/guoba-stream-e2e.yml`** (mirror of qr-vault-e2e.yml; adds webkit)

```yaml
name: Guoba Stream E2E

on:
  pull_request:
    branches: [main]
    paths:
      - '.github/workflows/guoba-stream-e2e.yml'
      - 'apps/guoba-stream/**'
      - '.npmrc'
      - '.nvmrc'
      - 'package.json'
      - 'pnpm-lock.yaml'
      - 'pnpm-workspace.yaml'

permissions:
  contents: read

jobs:
  e2e:
    runs-on: ubuntu-latest
    timeout-minutes: 15
    steps:
      - uses: actions/checkout@v7
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v6
        with:
          node-version: 24
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - run: pnpm --filter guoba-stream exec playwright install --with-deps chromium webkit
      - run: pnpm --filter guoba-stream test
      - run: pnpm --filter guoba-stream test:e2e
      - uses: actions/upload-artifact@v7
        if: failure()
        with:
          name: guoba-stream-playwright-report
          path: |
            apps/guoba-stream/playwright-report/
            apps/guoba-stream/test-results/
          if-no-files-found: ignore
          retention-days: 7
```

- [ ] **Step 2: Write `apps/guoba-stream/README.md`**

```markdown
# guoba-stream

Private, invite-only downloader for X/Twitter videos and GIFs. Paste a post link,
pick quality, save — including batch download for multi-video posts. Mobile-first.

## How it works

- `api/resolve` — validates the `X-Access-Key` header, normalizes the link
  (x.com / twitter.com / mobile / `/i/status/` / t.co; query params are stripped
  structurally), fetches X's syndication API, and returns media with short-lived
  HMAC-signed download links (1h TTL).
- `api/download` — verifies the signature (no key needed; the signature is the
  authorization), then streams the mp4 from `video.twimg.com` with
  `Content-Disposition: attachment`. Host allowlist prevents open-proxy abuse.
- Inline previews and raw-link fallbacks hit X's CDN directly — only actual
  downloads consume our bandwidth.

## Env vars (Vercel project settings + `.env.local` for dev)

| Var | Meaning |
| --- | --- |
| `ACCESS_KEYS` | Comma-separated access codes; one per person, delete to revoke |
| `DOWNLOAD_SIGNING_SECRET` | HMAC secret for download links (32+ random chars) |

## Commands

- `pnpm dev` — Vite + local `/api` bridge (needs `.env.local`, see `.env.example`)
- `pnpm test` / `pnpm test:e2e` — Vitest unit suite / Playwright (desktop + iPhone 13)
- `pnpm lint` / `pnpm build`

## Known limits

- The syndication API is unofficial; if X retires it, resolve returns the
  "upstream" error and this needs a new data source.
- NSFW / login-gated / deleted posts can't be fetched (clear error shown).
- Batch download fires N separate downloads; browsers may ask once for
  multi-download permission (iOS Safari confirms each file).
```

- [ ] **Step 3: Write `apps/guoba-stream/DESIGN.md`** — copy the decision table from the planning session verbatim: parsing via syndication API; proxy download + raw fallback; video+GIF scope (no photos); sequential batch downloads (no zip); quality dropdown defaulting to highest; URL compatibility set; tweet-card-with-preview results page; multi access codes + HMAC-signed download links; ember-on-charcoal visual direction (`#191412` / `#E07A3F`, Bricolage Grotesque + IBM Plex Mono); mobile-first constraints. Include the "known risks" list (syndication instability, restricted tweets, Vercel Hobby 100GB bandwidth).

- [ ] **Step 4: Commit**

```bash
git add .github/workflows/guoba-stream-e2e.yml apps/guoba-stream/README.md apps/guoba-stream/DESIGN.md
git commit -m "chore(guoba-stream): CI workflow and docs"
```

---

### Task 13: Manual QA + deployment handoff

- [ ] **Step 1: Full local verification**

```bash
pnpm --filter guoba-stream test && pnpm --filter guoba-stream lint && pnpm --filter guoba-stream test:e2e
pnpm lint
```

Expected: everything green, including root-level lint across the workspace.

- [ ] **Step 2: Live QA via agent-browser** (session `AGENT_BROWSER_SESSION_NAME=guoba`, against `pnpm dev` on localhost per repo habit)

Checklist:
- Gate: wrong code rejected, `dev-key` accepted, survives reload.
- Real multi-video tweet (find one via x.com search "multiple videos" or use any video tweet): cards render, preview plays, quality switch changes the raw link.
- Save: file lands with `handle_id.mp4` name; content plays.
- Batch: 2+ selected → sequential downloads fire.
- GIF tweet (e.g. from @giphy): GIF badge, single label, saves as mp4. **This also validates the synthetic gif fixture against reality — if the real shape differs, fix `lib/fixtures/gif-tweet.json` and the mapper.**
- t.co link: paste one (copy from a tweet body) → resolves.
- Mobile viewport (390px): single column, sticky bar above home indicator, input doesn't zoom.
- Error paths: garbage URL, deleted tweet (`https://x.com/a/status/1263145271946551300`), photo-only tweet.

- [ ] **Step 3: Deployment (needs Riki's say-so — do not deploy autonomously)**

Via the `deploy-to-vercel` skill: new Vercel project rooted at `apps/guoba-stream`, framework preset Vite. Set env vars `ACCESS_KEYS` (real codes, one per person) and `DOWNLOAD_SIGNING_SECRET` (`openssl rand -hex 32`). After deploy: smoke-test gate + one real download on a phone.

---

## Self-review notes

- Spec coverage: URL parsing incl. t.co + query stripping (T2), syndication + multi-video + GIF (T3), auth + signing (T4-T6), quality dropdown + selection + batch (T10), mobile (T10 step 8, T11 mobile project), error taxonomy (T3/T5/T9), CI (T12), deployment (T13). Photos deliberately excluded per spec.
- Types consistent: `ResolvedTweet`/`MediaItem`/`MediaVariant` defined once in `lib/types.ts` (T2) and imported everywhere; handler names `GET`; storage key `guoba-stream:access-key` used in app + e2e seed.
- Known judgment calls an executor should NOT "fix": junk syndication tokens currently work — we still compute the real token; `downloadUrl` is intentionally empty in `mapTweetResult` output and filled by the resolve handler (keeps the mapper pure/secret-free); e2e never exercises real `/api` (dev bridge is dev-only by design).
