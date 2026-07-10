import { isValidAccessKey } from '../lib/auth.js'
import { resolveTweetSource } from '../lib/resolve-source.js'
import { buildDownloadPath } from '../lib/sign.js'
import { resolveTweetId } from '../lib/tweet-url.js'
import type { ResolveErrorCode } from '../lib/types.js'

const SIGNATURE_TTL_SEC = 60 * 60

function errorStatus(code: ResolveErrorCode): number {
  if (code === 'invalid_link') return 400
  if (code === 'upstream') return 502
  return 404
}

function jsonError(code: ResolveErrorCode, status = errorStatus(code)): Response {
  return Response.json({ error: code }, { status })
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

  const resolved = await resolveTweetSource(tweetId)
  if (!resolved.ok) return jsonError(resolved.reason)

  const expiresAtSec = Math.floor(Date.now() / 1000) + SIGNATURE_TTL_SEC
  const { tweet } = resolved
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
