import type { MediaItem, MediaKind, MediaVariant, ResolvedTweet } from './types.js'

export function syndicationToken(tweetId: string): string {
  return ((Number(tweetId) / 1e15) * Math.PI).toString(36).replace(/(0+|\.)/g, '')
}

export function syndicationUrl(tweetId: string): string {
  const params = new URLSearchParams({ id: tweetId, token: syndicationToken(tweetId) })
  return `https://cdn.syndication.twimg.com/tweet-result?${params.toString()}`
}

export interface RawVariant {
  content_type: string
  url: string
  bitrate?: number
}

interface RawMedia {
  type: string
  media_url_https: string
  video_info?: { duration_millis?: number; variants: RawVariant[] }
}

export interface RawTweetResult {
  __typename?: string
  id_str?: string
  text?: string
  user?: { name?: string; screen_name?: string; profile_image_url_https?: string }
  mediaDetails?: RawMedia[]
}

export type MappedTweet =
  | { ok: true; tweet: ResolvedTweet }
  | { ok: false; reason: 'restricted' | 'no_video' }

const DIMENSIONS = /\/(\d{2,5})x(\d{2,5})\//

function mapKind(type: string): MediaKind | null {
  if (type === 'video') return 'video'
  if (type === 'animated_gif') return 'gif'
  return null
}

// Shared with the FxTwitter fallback: both sources expose twimg variants in this shape.
export function mapVariants(rawVariants: RawVariant[], kind: MediaKind): MediaVariant[] {
  return rawVariants
    .filter((variant) => variant.content_type === 'video/mp4')
    .map((variant) => {
      const dims = DIMENSIONS.exec(variant.url)
      const width = dims ? Number(dims[1]) : null
      const height = dims ? Number(dims[2]) : null
      return {
        label: kind === 'gif' ? 'gif' : height ? `${height}p` : 'mp4',
        width,
        height,
        bitrate: variant.bitrate ?? 0,
        rawUrl: variant.url,
        downloadUrl: '',
      }
    })
    .toSorted((a, b) => b.bitrate - a.bitrate)
}

export function mapTweetResult(raw: RawTweetResult): MappedTweet {
  // eslint-disable-next-line no-underscore-dangle
  if (raw.__typename !== 'Tweet') return { ok: false, reason: 'restricted' }
  const media: MediaItem[] = []
  for (const item of raw.mediaDetails ?? []) {
    const kind = mapKind(item.type)
    if (!kind || !item.video_info) continue
    const variants = mapVariants(item.video_info.variants, kind)
    if (variants.length === 0) continue
    media.push({
      index: media.length,
      kind,
      thumbnailUrl: item.media_url_https,
      durationMs: item.video_info.duration_millis ?? null,
      variants,
    })
  }
  if (media.length === 0) return { ok: false, reason: 'no_video' }
  return {
    ok: true,
    tweet: {
      id: raw.id_str ?? '',
      authorName: raw.user?.name ?? '',
      authorHandle: raw.user?.screen_name ?? '',
      avatarUrl: raw.user?.profile_image_url_https ?? '',
      text: raw.text ?? '',
      media,
    },
  }
}
