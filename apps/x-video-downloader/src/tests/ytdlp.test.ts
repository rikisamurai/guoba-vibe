import { describe, expect, it } from 'vitest'

import { normalizeYtDlpInfo } from '@/lib/ytdlp'

describe('normalizeYtDlpInfo', () => {
  it('normalizes multiple entries and sorts variants by quality', () => {
    const videos = normalizeYtDlpInfo({
      title: 'tweet title',
      entries: [
        {
          duration: 12.4,
          formats: [
            {
              ext: 'mp4',
              format_id: 'low',
              height: 360,
              tbr: 500,
              url: 'https://video.twimg.com/a/360.mp4',
              vcodec: 'avc1',
              width: 640,
            },
            {
              ext: 'mp4',
              format_id: 'high',
              height: 720,
              tbr: 1200,
              url: 'https://video.twimg.com/a/720.mp4',
              vcodec: 'avc1',
              width: 1280,
            },
          ],
          id: 'first',
          thumbnail: 'https://pbs.twimg.com/thumb.jpg',
          title: 'first video',
        },
        {
          formats: [
            {
              ext: 'mp4',
              format_id: 'medium',
              height: 480,
              url: 'https://video.twimg.com/b/480.mp4',
              vcodec: 'avc1',
            },
          ],
          id: 'second',
        },
      ],
    })

    expect(videos).toHaveLength(2)
    expect(videos[0]).toMatchObject({
      durationMs: 12400,
      id: 'first',
      title: 'first video',
    })
    expect(videos[0]?.variants.map((variant) => variant.label)).toEqual(['720p', '360p'])
    expect(videos[1]?.variants[0]?.label).toBe('480p')
  })

  it('drops entries without mp4 video variants', () => {
    const videos = normalizeYtDlpInfo({
      entries: [
        {
          formats: [{ ext: 'm4a', url: 'https://video.twimg.com/audio.m4a', vcodec: 'none' }],
        },
      ],
    })

    expect(videos).toEqual([])
  })

  it('dedupes equal qualities and prefers direct mp4 URLs over HLS', () => {
    const [video] = normalizeYtDlpInfo({
      formats: [
        {
          ext: 'mp4',
          format_id: 'hls-720',
          height: 720,
          protocol: 'm3u8_native',
          tbr: 2000,
          url: 'https://video.twimg.com/a/720.m3u8',
          vcodec: 'avc1',
        },
        {
          ext: 'mp4',
          format_id: 'http-720',
          height: 720,
          protocol: 'https',
          tbr: 1000,
          url: 'https://video.twimg.com/a/720.mp4',
          vcodec: 'avc1',
        },
      ],
    })

    expect(video?.variants).toEqual([
      expect.objectContaining({
        id: 'http-720',
        label: '720p',
        url: 'https://video.twimg.com/a/720.mp4',
      }),
    ])
  })
})
