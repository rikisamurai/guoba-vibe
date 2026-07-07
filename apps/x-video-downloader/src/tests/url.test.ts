import { describe, expect, it } from 'vitest'

import { isAllowedMediaUrl, parsePostUrl } from '@/lib/url'

describe('parsePostUrl', () => {
  it('normalizes x.com post URLs and strips query/hash', () => {
    expect(parsePostUrl('https://x.com/riki/status/1234567890?s=20#noise')).toEqual({
      inputUrl: 'https://x.com/riki/status/1234567890?s=20#noise',
      normalizedUrl: 'https://x.com/riki/status/1234567890',
      statusId: '1234567890',
      username: 'riki',
    })
  })

  it('accepts twitter.com and mobile.twitter.com', () => {
    expect(parsePostUrl('https://twitter.com/riki/status/12345').normalizedUrl).toBe(
      'https://x.com/riki/status/12345',
    )
    expect(parsePostUrl('https://mobile.twitter.com/riki/status/67890').normalizedUrl).toBe(
      'https://x.com/riki/status/67890',
    )
  })

  it('rejects unsupported URL shapes', () => {
    expect(() => parsePostUrl('https://x.com/riki')).toThrow('请粘贴标准推文详情页链接')
    expect(() => parsePostUrl('https://example.com/riki/status/12345')).toThrow(
      '仅支持 x.com / twitter.com 推文详情页链接',
    )
  })
})

describe('isAllowedMediaUrl', () => {
  it('allows twimg mp4 URLs only', () => {
    expect(isAllowedMediaUrl('https://video.twimg.com/ext_tw_video/abc/vid/720x1280/a.mp4')).toBe(
      true,
    )
    expect(isAllowedMediaUrl('https://video.twimg.com/ext_tw_video/abc/playlist.m3u8')).toBe(false)
    expect(isAllowedMediaUrl('https://example.com/a.mp4')).toBe(false)
  })
})
