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
    res = await fetch(`/api/resolve?url=${encodeURIComponent(url)}`, {
      headers: { 'x-access-key': key },
    })
  } catch {
    return { status: 'error', code: 'upstream' }
  }
  if (res.status === 401) return { status: 'unauthorized' }
  const body: { tweet?: ResolvedTweet; error?: ResolveErrorCode } | null = await res
    .json()
    .catch(() => null)
  if (res.ok && body?.tweet) return { status: 'ok', tweet: body.tweet }
  return { status: 'error', code: body?.error ?? 'upstream' }
}
