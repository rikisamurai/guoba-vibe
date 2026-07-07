export type ParsedPostUrl = {
  inputUrl: string
  normalizedUrl: string
  statusId: string
  username: string
}

export type VideoVariant = {
  id: string
  label: string
  url: string
  bitrate?: number
  ext?: string
  height?: number
  width?: number
}

export type TweetVideo = {
  id: string
  title: string
  thumbnail?: string
  durationMs?: number
  variants: VideoVariant[]
}

export type ParseResponse = {
  post: ParsedPostUrl
  videos: TweetVideo[]
}
