import { fxTweetUrl, mapFxTweet, type RawFxResponse } from './fxtwitter.js'
import {
  mapTweetResult,
  type MappedTweet,
  type RawTweetResult,
  syndicationUrl,
} from './syndication.js'

export type ResolveSourceResult = MappedTweet | { ok: false; reason: 'invalid_link' | 'upstream' }

interface PrimaryAttempt {
  result: ResolveSourceResult
  shouldFallback: boolean
}

function isRawTweetResult(value: unknown): value is RawTweetResult {
  return typeof value === 'object' && value !== null
}

function isRawFxResponse(value: unknown): value is RawFxResponse {
  return typeof value === 'object' && value !== null
}

async function resolvePrimary(tweetId: string, fetchImpl: typeof fetch): Promise<PrimaryAttempt> {
  let response: Response
  try {
    response = await fetchImpl(syndicationUrl(tweetId), {
      headers: { 'user-agent': 'Mozilla/5.0' },
    })
  } catch {
    return { result: { ok: false, reason: 'upstream' }, shouldFallback: true }
  }

  if (response.status === 400 || response.status === 404) {
    return { result: { ok: false, reason: 'invalid_link' }, shouldFallback: false }
  }
  if (!response.ok) {
    const shouldFallback = response.status >= 500 && response.status < 600
    return { result: { ok: false, reason: 'upstream' }, shouldFallback }
  }

  try {
    const raw = await response.json()
    if (!isRawTweetResult(raw)) {
      return { result: { ok: false, reason: 'upstream' }, shouldFallback: true }
    }
    const result = mapTweetResult(raw)
    return { result, shouldFallback: !result.ok && result.reason === 'restricted' }
  } catch {
    return { result: { ok: false, reason: 'upstream' }, shouldFallback: true }
  }
}

async function resolveFallback(
  tweetId: string,
  fetchImpl: typeof fetch,
): Promise<MappedTweet | null> {
  try {
    const response = await fetchImpl(fxTweetUrl(tweetId), {
      headers: { 'user-agent': 'Mozilla/5.0' },
    })
    if (!response.ok) return null
    const raw = await response.json()
    if (!isRawFxResponse(raw)) return null
    const result = mapFxTweet(raw)
    return result.ok ? result : null
  } catch {
    return null
  }
}

export async function resolveTweetSource(
  tweetId: string,
  fetchImpl: typeof fetch = fetch,
): Promise<ResolveSourceResult> {
  const primary = await resolvePrimary(tweetId, fetchImpl)
  if (!primary.shouldFallback) return primary.result
  return (await resolveFallback(tweetId, fetchImpl)) ?? primary.result
}
