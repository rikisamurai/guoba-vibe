import { describe, expect, it } from 'vitest'

import { buildDownloadPath, signDownload, verifyDownload } from './sign'

const SECRET = 'test-secret'
const URL_OK = 'https://video.twimg.com/ext_tw_video/1/pu/vid/1280x720/abc.mp4?tag=14'

describe('sign/verify', () => {
  it('round-trips a signed download', () => {
    const sig = signDownload(URL_OK, 'a_1.mp4', 1000, SECRET)
    expect(verifyDownload(URL_OK, 'a_1.mp4', 1000, sig, SECRET, 999)).toBe('ok')
  })

  it('rejects a tampered url', () => {
    const sig = signDownload(URL_OK, 'a_1.mp4', 1000, SECRET)
    expect(
      verifyDownload('https://video.twimg.com/other.mp4', 'a_1.mp4', 1000, sig, SECRET, 999),
    ).toBe('bad_signature')
  })

  it('rejects a tampered filename', () => {
    const sig = signDownload(URL_OK, 'a_1.mp4', 1000, SECRET)
    expect(verifyDownload(URL_OK, 'b.mp4', 1000, sig, SECRET, 999)).toBe('bad_signature')
  })

  it('rejects expiry in the past', () => {
    const sig = signDownload(URL_OK, 'a_1.mp4', 1000, SECRET)
    expect(verifyDownload(URL_OK, 'a_1.mp4', 1000, sig, SECRET, 1001)).toBe('expired')
  })

  it('rejects non-twimg hosts even with a valid signature', () => {
    const evil = 'https://evil.example.com/x.mp4'
    const sig = signDownload(evil, 'a.mp4', 1000, SECRET)
    expect(verifyDownload(evil, 'a.mp4', 1000, sig, SECRET, 999)).toBe('bad_url')
  })

  it('rejects http (non-https) twimg urls', () => {
    const insecure = 'http://video.twimg.com/x.mp4'
    const sig = signDownload(insecure, 'a.mp4', 1000, SECRET)
    expect(verifyDownload(insecure, 'a.mp4', 1000, sig, SECRET, 999)).toBe('bad_url')
  })

  it('rejects malformed signatures without throwing', () => {
    expect(verifyDownload(URL_OK, 'a.mp4', 1000, 'zz-not-hex', SECRET, 999)).toBe('bad_signature')
    expect(verifyDownload(URL_OK, 'a.mp4', 1000, '', SECRET, 999)).toBe('bad_signature')
  })

  it('builds a relative download path carrying all signed params', () => {
    const path = buildDownloadPath(URL_OK, 'a_1.mp4', 1000, SECRET)
    expect(path.startsWith('/api/download?')).toBe(true)
    const params = new URL(`http://x${path}`).searchParams
    expect(params.get('url')).toBe(URL_OK)
    expect(params.get('name')).toBe('a_1.mp4')
    expect(params.get('exp')).toBe('1000')
    expect(verifyDownload(URL_OK, 'a_1.mp4', 1000, params.get('sig')!, SECRET, 999)).toBe('ok')
  })
})
