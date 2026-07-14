export type MediaKind = 'video' | 'gif'

export interface MediaVariant {
  label: string
  width: number | null
  height: number | null
  bitrate: number
  rawUrl: string
  downloadUrl: string
}

export interface MediaItem {
  index: number
  kind: MediaKind
  thumbnailUrl: string
  durationMs: number | null
  variants: MediaVariant[]
}

export interface ResolvedTweet {
  id: string
  authorName: string
  authorHandle: string
  avatarUrl: string
  text: string
  media: MediaItem[]
}

export type ResolveErrorCode = 'invalid_link' | 'restricted' | 'no_video' | 'upstream'
