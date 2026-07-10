import { describe, expect, it, vi } from 'vitest'

import fxVideoTweet from './fixtures/fx-video-tweet.json' with { type: 'json' }
import videoTweet from './fixtures/video-tweet.json' with { type: 'json' }
import { resolveTweetSource } from './resolve-source.js'

const TWEET_ID = '1585341984679469056'

function mockFetch(): ReturnType<typeof vi.fn<typeof fetch>> {
  return vi.fn<typeof fetch>()
}

describe('resolveTweetSource', () => {
  it('returns syndication media without calling the fallback', async () => {
    const fetchImpl = mockFetch().mockResolvedValueOnce(Response.json(videoTweet))

    const result = await resolveTweetSource(TWEET_ID, fetchImpl)

    expect(result.ok).toBe(true)
    expect(fetchImpl).toHaveBeenCalledTimes(1)
  })

  it('falls back when syndication reports a restricted tweet', async () => {
    const fetchImpl = mockFetch()
      .mockResolvedValueOnce(Response.json({ __typename: 'TweetTombstone' }))
      .mockResolvedValueOnce(Response.json(fxVideoTweet))

    const result = await resolveTweetSource(TWEET_ID, fetchImpl)

    expect(result.ok).toBe(true)
    expect(fetchImpl).toHaveBeenCalledTimes(2)
  })

  it.each([
    ['network failure', new TypeError('fetch failed')],
    ['server failure', new Response('down', { status: 503 })],
    [
      'malformed payload',
      Response.json({
        __typename: 'Tweet',
        mediaDetails: [{ type: 'video', media_url_https: 'x', video_info: {} }],
      }),
    ],
  ])('falls back after a recoverable syndication %s', async (_label, primaryFailure) => {
    const fetchImpl = mockFetch()
    if (primaryFailure instanceof Error) fetchImpl.mockRejectedValueOnce(primaryFailure)
    else fetchImpl.mockResolvedValueOnce(primaryFailure)
    fetchImpl.mockResolvedValueOnce(Response.json(fxVideoTweet))

    const result = await resolveTweetSource(TWEET_ID, fetchImpl)

    expect(result.ok).toBe(true)
    expect(fetchImpl).toHaveBeenCalledTimes(2)
  })

  it.each([
    ['400 response', new Response('bad', { status: 400 }), 'invalid_link'],
    ['404 response', new Response('missing', { status: 404 }), 'invalid_link'],
    ['429 response', new Response('slow down', { status: 429 }), 'upstream'],
    ['tweet without video', Response.json({ __typename: 'Tweet', id_str: TWEET_ID }), 'no_video'],
  ] as const)('does not fall back after a terminal %s', async (_label, response, reason) => {
    const fetchImpl = mockFetch().mockResolvedValueOnce(response)

    await expect(resolveTweetSource(TWEET_ID, fetchImpl)).resolves.toEqual({ ok: false, reason })
    expect(fetchImpl).toHaveBeenCalledTimes(1)
  })

  it.each([
    ['restricted', Response.json({ __typename: 'TweetTombstone' }), 'restricted'],
    ['upstream', new Response('down', { status: 503 }), 'upstream'],
  ] as const)(
    'preserves the primary %s error when the fallback fails',
    async (_label, primaryResponse, reason) => {
      const fetchImpl = mockFetch()
        .mockResolvedValueOnce(primaryResponse)
        .mockResolvedValueOnce(new Response('missing', { status: 404 }))

      await expect(resolveTweetSource(TWEET_ID, fetchImpl)).resolves.toEqual({ ok: false, reason })
      expect(fetchImpl).toHaveBeenCalledTimes(2)
    },
  )
})
