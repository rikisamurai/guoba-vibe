import { describe, expect, it, vi } from 'vitest'

import { parseTweetUrl, resolveTweetId } from './tweet-url'

describe('parseTweetUrl', () => {
  it.each([
    'https://x.com/vercel/status/1628832338187636740',
    'https://twitter.com/vercel/status/1628832338187636740',
    'https://mobile.twitter.com/vercel/status/1628832338187636740',
    'https://www.x.com/vercel/status/1628832338187636740',
    'https://x.com/i/status/1628832338187636740',
    'https://x.com/i/web/status/1628832338187636740',
    'https://x.com/vercel/status/1628832338187636740?s=46&t=abcDEF',
    'https://x.com/vercel/status/1628832338187636740/video/1',
    '  https://x.com/vercel/status/1628832338187636740  ',
  ])('extracts the tweet id from %s', (input) => {
    expect(parseTweetUrl(input)).toEqual({ ok: true, tweetId: '1628832338187636740' })
  })

  it.each([
    'not a url',
    'https://example.com/vercel/status/123',
    'https://x.com/vercel',
    'https://x.com/vercel/status/abc',
    'https://x.com/vercel/status/123abc',
    'ftp://x.com/vercel/status/123',
    '',
  ])('rejects %s', (input) => {
    expect(parseTweetUrl(input)).toEqual({ ok: false, reason: 'invalid' })
  })

  it('flags t.co links for redirect resolution and drops query params', () => {
    expect(parseTweetUrl('https://t.co/AbC123?xyz=1')).toEqual({
      ok: false,
      reason: 'shortlink',
      url: 'https://t.co/AbC123',
    })
  })
})

describe('resolveTweetId', () => {
  it('returns the id directly for status links', async () => {
    await expect(resolveTweetId('https://x.com/a/status/42')).resolves.toBe('42')
  })

  it('follows one t.co redirect', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      new Response(null, {
        status: 301,
        headers: { location: 'https://x.com/a/status/42?s=20' },
      }),
    )
    await expect(resolveTweetId('https://t.co/abc', fetchImpl)).resolves.toBe('42')
    expect(fetchImpl).toHaveBeenCalledWith('https://t.co/abc', {
      method: 'HEAD',
      redirect: 'manual',
    })
  })

  it('gives up when the redirect target is not a tweet', async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValue(
        new Response(null, { status: 301, headers: { location: 'https://nextjs.org/13-2' } }),
      )
    await expect(resolveTweetId('https://t.co/abc', fetchImpl)).resolves.toBeNull()
  })

  it('returns null when the redirect has no location', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(new Response(null, { status: 200 }))
    await expect(resolveTweetId('https://t.co/abc', fetchImpl)).resolves.toBeNull()
  })

  it('returns null for garbage', async () => {
    await expect(resolveTweetId('nope')).resolves.toBeNull()
  })

  it('propagates network errors from the redirect hop', async () => {
    const fetchImpl = vi.fn().mockRejectedValue(new TypeError('fetch failed'))
    await expect(resolveTweetId('https://t.co/abc', fetchImpl)).rejects.toThrow()
  })
})
