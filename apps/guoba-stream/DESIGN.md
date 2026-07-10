# guoba-stream design decisions

Decisions settled in the 2026-07-07 planning session (see
`docs/superpowers/plans/2026-07-07-guoba-stream.md` for the full build plan).

## Product decisions

| Branch            | Decision                                                                                                                                                                                                 |
| ----------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Data source       | X syndication API (`cdn.syndication.twimg.com/tweet-result`, react-tweet-style token) first; FxTwitter fallback for restricted posts and recoverable upstream failures                                   |
| Download delivery | Proxy streaming with forced attachment and Range/206 passthrough as primary; raw CDN link as per-video fallback                                                                                          |
| Media scope       | Videos + GIFs (GIFs are mp4s upstream, badge in UI); photos out of scope                                                                                                                                 |
| Batch download    | Sequential individual downloads (500ms spacing), no zip                                                                                                                                                  |
| Quality           | Per-video dropdown labeled by resolution; defaults to highest bitrate                                                                                                                                    |
| URL input         | x.com / twitter.com / mobile.\* / `/i/status/` / t.co (one server-side redirect hop); query params stripped structurally before any use — privacy requirement, X uses `?s=`/`&t=` to identify the sharer |
| Results page      | Tweet card (avatar, name, text) + playable inline previews + selection checkboxes + sticky batch bar                                                                                                     |
| Auth              | Multiple access codes in `ACCESS_KEYS` env (per-person, individually revocable) + short-lived HMAC-signed download links; `/api/download` trusts only the signature                                      |

## Security posture

- Download proxy is allowlisted to `https://video.twimg.com` — valid signature
  alone is not enough (open-proxy prevention).
- HMAC payload is `JSON.stringify([url, filename, exp])` — collision-proof
  across field boundaries.
- Filenames are sanitized to `[\w.-]` at signing time AND validated at download
  time (Content-Disposition header-injection defense; upstream JSON is untrusted).
- Access-key check uses a plain list compare; timing side channels are accepted
  for a friends-only tool with human-issued codes.

## Visual direction (approved mock)

Warm charcoal `#191412` + ember `#E07A3F` ("guoba" palette), Bricolage Grotesque
display + IBM Plex Mono body, English UI copy. Mobile-first: single-column cards,
44px touch targets, 16px inputs (iOS anti-zoom), `env(safe-area-inset-bottom)`
on the sticky bar, `playsInline` previews.

## Known risks (accepted)

1. Syndication and FxTwitter are unofficial and may change or vanish — if both
   fail, this surfaces as the "upstream" error and needs a new data source.
2. Restricted / NSFW posts fall back to FxTwitter; login-gated or deleted posts
   still show a clear error when neither source can serve them.
3. Vercel Hobby bandwidth (100GB/mo) carries proxied downloads; signed links are
   replayable within their 1h TTL — acceptable at friends-only scale.
