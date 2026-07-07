# X Video Downloader

Mobile-first private web tool for downloading videos from X/Twitter post links.

## Setup

```bash
pnpm install
XVD_INVITE_CODES=riki-local XVD_SESSION_SECRET="$(openssl rand -hex 32)" pnpm --filter x-video-downloader dev
```

Open <http://localhost:3000>, enter the invite code, paste a supported post URL, parse videos, choose quality, then download selected videos.

Supported URL shape:

- `https://x.com/{user}/status/{id}`
- `https://twitter.com/{user}/status/{id}`
- `https://mobile.twitter.com/{user}/status/{id}`

Query strings and hash fragments are stripped before parsing.

## Notes

- Vercel deployments download a standalone `yt-dlp` binary during build; set `XVD_YTDLP_PATH` to override it.
- Downloads stream through the app server with `Content-Disposition: attachment`, because X CDN rejects some direct browser requests from a local/private tool.
- Multiple selected videos are triggered as separate browser downloads.
