import { mapVariants, type MappedTweet, type RawVariant } from './syndication.js'
import type { MediaItem, MediaKind } from './types.js'

export function fxTweetUrl(tweetId: string): string {
  return `https://api.fxtwitter.com/status/${tweetId}`
}

interface RawFxVideo {
  type?: string
  thumbnail_url?: string
  duration?: number
  variants?: RawVariant[]
}

export interface RawFxResponse {
  code?: number
  tweet?: {
    id?: string
    text?: string
    author?: { name?: string; screen_name?: string; avatar_url?: string }
    media?: { videos?: RawFxVideo[] }
  }
}

function mapKind(type?: string): MediaKind | null {
  if (type === 'video') return 'video'
  if (type === 'gif') return 'gif'
  return null
}

export function mapFxTweet(raw: RawFxResponse): MappedTweet {
  const { tweet } = raw
  if (!tweet) return { ok: false, reason: 'restricted' }
  const media: MediaItem[] = []
  for (const item of tweet.media?.videos ?? []) {
    const kind = mapKind(item.type)
    if (!kind) continue
    const variants = mapVariants(item.variants ?? [], kind)
    if (variants.length === 0) continue
    media.push({
      index: media.length,
      kind,
      thumbnailUrl: item.thumbnail_url ?? '',
      durationMs: item.duration ? Math.round(item.duration * 1000) : null,
      variants,
    })
  }
  if (media.length === 0) return { ok: false, reason: 'no_video' }
  return {
    ok: true,
    tweet: {
      id: tweet.id ?? '',
      authorName: tweet.author?.name ?? '',
      authorHandle: tweet.author?.screen_name ?? '',
      avatarUrl: tweet.author?.avatar_url ?? '',
      text: tweet.text ?? '',
      media,
    },
  }
}
