# guoba-stream

Private, invite-only downloader for X/Twitter videos and GIFs. Paste a post link,
pick quality, save — including batch download for multi-video posts. Mobile-first.

## How it works

- `api/resolve` — validates the `X-Access-Key` header, normalizes the link
  (x.com / twitter.com / mobile / `/i/status/` / t.co; query params are stripped
  structurally — the parser only ever reads the pathname), tries X's syndication
  API first and FxTwitter after restricted or recoverable upstream failures, then
  returns media with short-lived HMAC-signed download links (1h TTL).
- `api/download` — verifies the signature (no key needed; the signature is the
  authorization, because `<a>` navigation can't send headers), then streams the
  mp4 from `video.twimg.com` with `Content-Disposition: attachment`. A host
  allowlist plus filename sanitization prevent open-proxy abuse and header
  injection.
- Inline previews and raw-link fallbacks hit X's CDN directly — only actual
  downloads consume our bandwidth.

## Env vars (Vercel project settings; `.env.local` for dev, see `.env.example`)

| Var                       | Meaning                                                        |
| ------------------------- | -------------------------------------------------------------- |
| `ACCESS_KEYS`             | Comma-separated access codes; one per person, delete to revoke |
| `DOWNLOAD_SIGNING_SECRET` | HMAC secret for download links (32+ random chars)              |

## Commands

- `pnpm dev` — Vite + local `/api` bridge (`dev-api-plugin.ts`, dev-only)
- `pnpm test` / `pnpm test:e2e` — Vitest unit suite / Playwright (Desktop Chrome + iPhone 13)
- `pnpm lint` / `pnpm build`

## Known limits

- Both syndication and FxTwitter are unofficial; if both fail, resolve returns the
  "upstream" error and this needs a new data source.
- NSFW / login-gated / deleted posts can't be fetched (clear error shown).
- Batch download fires N separate downloads; browsers may ask once for
  multi-download permission (iOS Safari confirms each file).
