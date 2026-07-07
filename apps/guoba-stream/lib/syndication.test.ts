import { describe, expect, it } from 'vitest'

import gifTweet from './fixtures/gif-tweet.json'
import videoTweet from './fixtures/video-tweet.json'
import {
  mapTweetResult,
  syndicationToken,
  syndicationUrl,
  type RawTweetResult,
} from './syndication'

describe('syndicationToken', () => {
  it('matches the react-tweet token algorithm', () => {
    expect(syndicationToken('1628832338187636740')).toBe('3y54libozsy')
  })
})

describe('syndicationUrl', () => {
  it('builds the tweet-result URL with id and token', () => {
    const url = new URL(syndicationUrl('1628832338187636740'))
    expect(url.origin + url.pathname).toBe('https://cdn.syndication.twimg.com/tweet-result')
    expect(url.searchParams.get('id')).toBe('1628832338187636740')
    expect(url.searchParams.get('token')).toBe('3y54libozsy')
  })
})

describe('mapTweetResult', () => {
  it('maps a video tweet: filters m3u8, sorts by bitrate desc, labels by height', () => {
    const mapped = mapTweetResult(videoTweet as RawTweetResult)
    if (!mapped.ok) throw new Error('expected ok')
    expect(mapped.tweet.authorHandle).toBe('elonmusk')
    expect(mapped.tweet.media).toHaveLength(1)
    const media = mapped.tweet.media[0]
    expect(media.kind).toBe('video')
    expect(media.durationMs).toBe(9301)
    expect(media.variants.map((v) => v.label)).toEqual(['1080p', '720p', '270p'])
    expect(media.variants[0].width).toBe(1920)
    expect(media.variants[0].rawUrl).toContain('1920x1080')
  })

  it('maps an animated gif and skips photos', () => {
    const mapped = mapTweetResult(gifTweet as RawTweetResult)
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

  it('reports tombstones as restricted', () => {
    expect(mapTweetResult({ __typename: 'TweetTombstone' })).toEqual({
      ok: false,
      reason: 'restricted',
    })
  })

  it('reports photo-only tweets as no_video', () => {
    const raw: RawTweetResult = {
      __typename: 'Tweet',
      id_str: '2',
      text: 'photos only',
      user: { name: 'A', screen_name: 'a', profile_image_url_https: '' },
      mediaDetails: [{ type: 'photo', media_url_https: 'https://pbs.twimg.com/media/p.jpg' }],
    }
    expect(mapTweetResult(raw)).toEqual({ ok: false, reason: 'no_video' })
  })

  it('reports text-only tweets as no_video', () => {
    expect(mapTweetResult({ __typename: 'Tweet', id_str: '3', text: 'hi' })).toEqual({
      ok: false,
      reason: 'no_video',
    })
  })
})
