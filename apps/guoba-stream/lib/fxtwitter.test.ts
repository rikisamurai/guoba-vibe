import { describe, expect, it } from 'vitest'

import fxVideoTweet from './fixtures/fx-video-tweet.json' with { type: 'json' }
import { fxTweetUrl, mapFxTweet, type RawFxResponse } from './fxtwitter.js'

describe('fxTweetUrl', () => {
  it('builds the status URL from the tweet id', () => {
    expect(fxTweetUrl('2070505379432456331')).toBe(
      'https://api.fxtwitter.com/status/2070505379432456331',
    )
  })
})

describe('mapFxTweet', () => {
  it('maps a video tweet: filters m3u8, sorts by bitrate desc, labels by height', () => {
    const mapped = mapFxTweet(fxVideoTweet as RawFxResponse)
    if (!mapped.ok) throw new Error('expected ok')
    expect(mapped.tweet.id).toBe('2070505379432456331')
    expect(mapped.tweet.authorHandle).toBe('chenbao11522')
    expect(mapped.tweet.media).toHaveLength(1)
    const media = mapped.tweet.media[0]
    expect(media.kind).toBe('video')
    expect(media.durationMs).toBe(185364)
    expect(media.thumbnailUrl).toContain('pbs.twimg.com')
    expect(media.variants.map((v) => v.label)).toEqual(['720p', '360p', '270p'])
    expect(media.variants[0].rawUrl).toContain('1280x720')
  })

  it('maps gifs and skips unknown media types', () => {
    const raw: RawFxResponse = {
      code: 200,
      tweet: {
        id: '9',
        text: 'gif',
        author: { name: 'A', screen_name: 'a', avatar_url: '' },
        media: {
          videos: [
            { type: 'unknown', variants: [] },
            {
              type: 'gif',
              thumbnail_url: 'https://pbs.twimg.com/tweet_video_thumb/x.jpg',
              variants: [
                {
                  content_type: 'video/mp4',
                  url: 'https://video.twimg.com/tweet_video/AbCdEf.mp4',
                },
              ],
            },
          ],
        },
      },
    }
    const mapped = mapFxTweet(raw)
    if (!mapped.ok) throw new Error('expected ok')
    expect(mapped.tweet.media).toHaveLength(1)
    const media = mapped.tweet.media[0]
    expect(media.kind).toBe('gif')
    expect(media.durationMs).toBeNull()
    expect(media.variants).toEqual([
      expect.objectContaining({
        label: 'gif',
        bitrate: 0,
        rawUrl: 'https://video.twimg.com/tweet_video/AbCdEf.mp4',
      }),
    ])
  })

  it('reports tweets without videos as no_video', () => {
    const raw: RawFxResponse = {
      code: 200,
      tweet: { id: '2', text: 'photos only', author: { name: 'A', screen_name: 'a' } },
    }
    expect(mapFxTweet(raw)).toEqual({ ok: false, reason: 'no_video' })
  })

  it('reports responses without a tweet as restricted', () => {
    expect(mapFxTweet({ code: 404 })).toEqual({ ok: false, reason: 'restricted' })
  })
})
