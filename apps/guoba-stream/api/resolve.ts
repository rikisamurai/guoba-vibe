import { isValidAccessKey } from '../lib/auth.js'
import { buildDownloadPath } from '../lib/sign.js'
import { mapTweetResult, syndicationUrl, type RawTweetResult } from '../lib/syndication.js'
import { resolveTweetId } from '../lib/tweet-url.js'
import type { ResolveErrorCode } from '../lib/types.js'

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
