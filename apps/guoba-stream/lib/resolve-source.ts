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

type UnknownRecord = Record<string, unknown>

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === 'object' && value !== null
}

function isRawVariant(value: unknown): boolean {
  return (
    isRecord(value) &&
    typeof value.content_type === 'string' &&
    typeof value.url === 'string' &&
    (value.bitrate === undefined || typeof value.bitrate === 'number')
  )
}

function isRawMedia(value: unknown): boolean {
  if (!isRecord(value) || typeof value.type !== 'string') return false
  if (value.type !== 'video' && value.type !== 'animated_gif') return true
  if (typeof value.media_url_https !== 'string') return false
  if (!isRecord(value.video_info) || !Array.isArray(value.video_info.variants)) return false
  if (
    value.video_info.duration_millis !== undefined &&
    typeof value.video_info.duration_millis !== 'number'
  )
    return false
  return value.video_info.variants.every(isRawVariant)
}

function isRawTweetResult(value: unknown): value is RawTweetResult {
  if (!isRecord(value)) return false
  // eslint-disable-next-line no-underscore-dangle
  const typename = value.__typename
  if (typeof typename !== 'string') return false
  if (typename !== 'Tweet') return true
  return (
    value.mediaDetails === undefined ||
    (Array.isArray(value.mediaDetails) && value.mediaDetails.every(isRawMedia))
  )
}

function isRawFxResponse(value: unknown): value is RawFxResponse {
  return isRecord(value)
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
