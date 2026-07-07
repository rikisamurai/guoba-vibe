# apps/x-video-downloader

Private, mobile-first web tool for resolving video variants from X/Twitter post links and handing downloads back to the browser.

## Stack

- Next.js 16 App Router + React 19.
- No database. Invite-code login is signed with an `HttpOnly` cookie.
- `yt-dlp` is executed only from route handlers on the Node.js runtime.
- CSS is app-local plain CSS. Keep the UI mobile-first.

## Required Environment

```bash
XVD_INVITE_CODES=riki-local,friend-code
XVD_SESSION_SECRET=replace-with-a-long-random-secret
```

Vercel deployments use the packaged `youtube-dl-exec` binary by default. Set this only to override it:

```bash
XVD_YTDLP_PATH=/absolute/path/to/yt-dlp
```

## Security Boundary

- `/api/parse` and `/api/download` must validate the signed session cookie in the route handler.
- Do not rely on page-level checks alone.
- Downloads stream through the server with strict auth/rate limits because direct X CDN browser requests may be rejected by referrer/user-agent checks.
- Keep rate limits and parse concurrency checks in place even though this is a private tool.

## Test Workflow

For non-trivial changes to `src/lib` or `src/app/api`:

1. Add or update a focused Vitest test.
2. Run `pnpm --filter x-video-downloader test`.
3. Run `pnpm --filter x-video-downloader lint`.
4. Run `pnpm --filter x-video-downloader build`.

For visible UI changes, verify in a real browser at a mobile viewport and capture a screenshot.
