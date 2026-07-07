import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { buildDownloadPath } from '../lib/sign'
import { GET } from './download'

const SECRET = 'test-secret'
const RAW = 'https://video.twimg.com/ext_tw_video/1/pu/vid/1280x720/abc.mp4?tag=14'

const futureExp = () => Math.floor(Date.now() / 1000) + 600

beforeEach(() => {
  vi.stubEnv('DOWNLOAD_SIGNING_SECRET', SECRET)
})

afterEach(() => {
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
})

describe('GET /api/download', () => {
  it('streams the upstream body with attachment and length headers', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response('video-bytes', {
          headers: { 'content-type': 'video/mp4', 'content-length': '11' },
        }),
      ),
    )
    const path = buildDownloadPath(RAW, 'a_1.mp4', futureExp(), SECRET)
    const res = await GET(new Request(`http://localhost${path}`))
    expect(res.status).toBe(200)
    expect(res.headers.get('content-disposition')).toBe('attachment; filename="a_1.mp4"')
    expect(res.headers.get('content-type')).toBe('video/mp4')
    expect(res.headers.get('content-length')).toBe('11')
    expect(await res.text()).toBe('video-bytes')
  })

  it('rejects tampered params with 403 and never fetches upstream', async () => {
    const fetchSpy = vi.fn()
    vi.stubGlobal('fetch', fetchSpy)
    const path = buildDownloadPath(RAW, 'a_1.mp4', futureExp(), SECRET)
    const res = await GET(new Request(`http://localhost${path.replace('a_1.mp4', 'b.mp4')}`))
    expect(res.status).toBe(403)
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('rejects expired links with 410', async () => {
    const past = Math.floor(Date.now() / 1000) - 10
    const path = buildDownloadPath(RAW, 'a_1.mp4', past, SECRET)
    const res = await GET(new Request(`http://localhost${path}`))
    expect(res.status).toBe(410)
  })

  it('maps upstream failure to 502', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, { status: 404 })))
    const path = buildDownloadPath(RAW, 'a_1.mp4', futureExp(), SECRET)
    const res = await GET(new Request(`http://localhost${path}`))
    expect(res.status).toBe(502)
  })

  it('maps upstream network errors to 502', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('fetch failed')))
    const path = buildDownloadPath(RAW, 'a_1.mp4', futureExp(), SECRET)
    const res = await GET(new Request(`http://localhost${path}`))
    expect(res.status).toBe(502)
  })

  it('rejects header-breaking filenames even with a valid signature', async () => {
    const fetchSpy = vi.fn()
    vi.stubGlobal('fetch', fetchSpy)
    const path = buildDownloadPath(RAW, 'a".mp4', futureExp(), SECRET)
    const res = await GET(new Request(`http://localhost${path}`))
    expect(res.status).toBe(403)
    expect(fetchSpy).not.toHaveBeenCalled()
  })
})
