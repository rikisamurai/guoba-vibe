const TWEET_HOSTS = new Set([
  'x.com',
  'www.x.com',
  'mobile.x.com',
  'twitter.com',
  'www.twitter.com',
  'mobile.twitter.com',
])

const STATUS_PATH = /^\/(?:i\/web\/status|i\/status|[A-Za-z0-9_]{1,15}\/status)\/(\d{1,25})/

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

export async function resolveTweetId(
  input: string,
  fetchImpl: typeof fetch = fetch,
): Promise<string | null> {
  const parsed = parseTweetUrl(input)
  if (parsed.ok) return parsed.tweetId
  if (parsed.reason !== 'shortlink') return null
  const response = await fetchImpl(parsed.url, { method: 'HEAD', redirect: 'manual' })
  const location = response.headers.get('location')
  if (!location) return null
  const redirected = parseTweetUrl(location)
  return redirected.ok ? redirected.tweetId : null
}
