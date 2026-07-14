export const ACCESS_KEY = 'e2e-key'

const PIXEL = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7'

function variant(label: string, height: number, bitrate: number) {
  const rawUrl = `https://video.twimg.com/ext_tw_video/1/pu/vid/${height * 2}x${height}/v${height}.mp4`
  return {
    label,
    width: height * 2,
    height,
    bitrate,
    rawUrl,
    downloadUrl: `/api/download?url=${encodeURIComponent(rawUrl)}&name=sana_films_1_x.mp4&exp=9999999999&sig=e2e`,
  }
}

export const RESOLVED_TWEET = {
  tweet: {
    id: '1585341984679469056',
    authorName: 'Sana Uchida',
    authorHandle: 'sana_films',
    avatarUrl: PIXEL,
    text: 'Three cuts from the night market shoot',
    media: [
      {
        index: 0,
        kind: 'video',
        thumbnailUrl: PIXEL,
        durationMs: 42000,
        variants: [variant('1080p', 540, 3), variant('720p', 360, 2), variant('270p', 135, 1)],
      },
      {
        index: 1,
        kind: 'video',
        thumbnailUrl: PIXEL,
        durationMs: 75000,
        variants: [variant('720p', 360, 2)],
      },
      {
        index: 2,
        kind: 'gif',
        thumbnailUrl: PIXEL,
        durationMs: null,
        variants: [variant('gif', 240, 0)],
      },
    ],
  },
}
