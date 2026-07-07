import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import videoTweet from '../lib/fixtures/video-tweet.json'
import { verifyDownload } from '../lib/sign'
import type { ResolvedTweet } from '../lib/types'
import { GET } from './resolve'

const KEY = 'friend-key'
const SECRET = 'test-secret'

function makeRequest(query: string, key?: string): Request {
  return new Request(`http://localhost/api/resolve${query}`, {
    headers: key ? { 'x-access-key': key } : {},
  })
}

function hasTweet(value: unknown): value is { tweet: ResolvedTweet } {
  return typeof value === 'object' && value !== null && 'tweet' in value
}

beforeEach(() => {
  vi.stubEnv('ACCESS_KEYS', ` ${KEY} , other-key`)
  vi.stubEnv('DOWNLOAD_SIGNING_SECRET', SECRET)
})

afterEach(() => {
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
})

describe('GET /api/resolve', () => {
  it('rejects a missing or wrong access key with 401', async () => {
    expect((await GET(makeRequest('?ping=1'))).status).toBe(401)
    expect((await GET(makeRequest('?ping=1', 'wrong'))).status).toBe(401)
  })

  it('answers ping with 204 for a valid key', async () => {
    expect((await GET(makeRequest('?ping=1', KEY))).status).toBe(204)
  })

  it('answers ping even when the signing secret is missing', async () => {
    vi.stubEnv('DOWNLOAD_SIGNING_SECRET', '')
    expect((await GET(makeRequest('?ping=1', KEY))).status).toBe(204)
  })

  it('rejects non-tweet urls with invalid_link', async () => {
    const res = await GET(makeRequest(`?url=${encodeURIComponent('https://example.com/x')}`, KEY))
    expect(res.status).toBe(400)
    expect(await res.json()).toEqual({ error: 'invalid_link' })
  })

  it('maps a tombstone to restricted', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(Response.json({ __typename: 'TweetTombstone' })),
    )
    const res = await GET(
      makeRequest(`?url=${encodeURIComponent('https://x.com/a/status/1')}`, KEY),
    )
    expect(res.status).toBe(404)
    expect(await res.json()).toEqual({ error: 'restricted' })
  })

  it('maps syndication 400 to invalid_link and other failures to upstream', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('bad', { status: 400 })))
    expect(
      (await GET(makeRequest(`?url=${encodeURIComponent('https://x.com/a/status/1')}`, KEY)))
        .status,
    ).toBe(400)
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('down', { status: 503 })))
    expect(
      (await GET(makeRequest(`?url=${encodeURIComponent('https://x.com/a/status/1')}`, KEY)))
        .status,
    ).toBe(502)
  })

  it('maps t.co network failures to upstream', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('fetch failed')))
    const res = await GET(makeRequest(`?url=${encodeURIComponent('https://t.co/abc')}`, KEY))
    expect(res.status).toBe(502)
    expect(await res.json()).toEqual({ error: 'upstream' })
  })

  it('maps malformed upstream payloads to upstream', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        Response.json({
          __typename: 'Tweet',
          mediaDetails: [{ type: 'video', media_url_https: 'x', video_info: {} }],
        }),
      ),
    )
    const res = await GET(
      makeRequest(`?url=${encodeURIComponent('https://x.com/a/status/1')}`, KEY),
    )
    expect(res.status).toBe(502)
    expect(await res.json()).toEqual({ error: 'upstream' })
  })

  it('maps syndication network failures to upstream', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('fetch failed')))
    const res = await GET(
      makeRequest(`?url=${encodeURIComponent('https://x.com/a/status/1')}`, KEY),
    )
    expect(res.status).toBe(502)
    expect(await res.json()).toEqual({ error: 'upstream' })
  })

  it('returns the tweet with signed download urls and filenames', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json(videoTweet)))
    const res = await GET(
      makeRequest(
        `?url=${encodeURIComponent('https://x.com/elonmusk/status/1585341984679469056?s=46')}`,
        KEY,
      ),
    )
    expect(res.status).toBe(200)
    const body = await res.json()
    if (!hasTweet(body)) throw new Error('expected tweet in response body')
    const variant = body.tweet.media[0].variants[0]
    expect(variant.label).toBe('1080p')
    const params = new URL(`http://x${variant.downloadUrl}`).searchParams
    expect(params.get('name')).toBe('elonmusk_1585341984679469056.mp4')
    expect(
      verifyDownload(
        params.get('url')!,
        params.get('name')!,
        Number(params.get('exp')),
        params.get('sig')!,
        SECRET,
        Math.floor(Date.now() / 1000),
      ),
    ).toBe('ok')
  })

  it('sanitizes hostile author handles out of filenames', async () => {
    const hostile = { ...videoTweet, user: { ...videoTweet.user, screen_name: 'evil"\r\n;handle' } }
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json(hostile)))
    const res = await GET(
      makeRequest(`?url=${encodeURIComponent('https://x.com/a/status/1585341984679469056')}`, KEY),
    )
    const body = await res.json()
    if (!hasTweet(body)) throw new Error('expected tweet in response body')
    const params = new URL(`http://x${body.tweet.media[0].variants[0].downloadUrl}`).searchParams
    expect(params.get('name')).toBe('evilhandle_1585341984679469056.mp4')
  })
})
