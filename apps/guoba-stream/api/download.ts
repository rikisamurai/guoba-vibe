import { verifyDownload } from '../lib/sign.js'

export const maxDuration = 60

export async function GET(request: Request): Promise<Response> {
  const params = new URL(request.url).searchParams
  const rawUrl = params.get('url') ?? ''
  const name = params.get('name') ?? 'video.mp4'
  const exp = Number(params.get('exp') ?? '0')
  const sig = params.get('sig') ?? ''
  // Signed names are already sanitized by resolve; this guards the Headers constructor
  // against anything else (quotes/CRLF in filename would throw or inject parameters).
  if (!/^[\w.-]+$/.test(name)) return new Response('Invalid download link', { status: 403 })
  const secret = process.env.DOWNLOAD_SIGNING_SECRET
  if (!secret) return new Response('Server misconfigured', { status: 500 })

  const verdict = verifyDownload(rawUrl, name, exp, sig, secret, Math.floor(Date.now() / 1000))
  if (verdict === 'expired')
    return new Response('Link expired — fetch the post again', { status: 410 })
  if (verdict !== 'ok') return new Response('Invalid download link', { status: 403 })

  let upstream: Response
  try {
    const range = request.headers.get('range')
    upstream = range ? await fetch(rawUrl, { headers: { range } }) : await fetch(rawUrl)
  } catch {
    return new Response('Upstream fetch failed', { status: 502 })
  }
  if (!upstream.ok || !upstream.body) return new Response('Upstream fetch failed', { status: 502 })

  const headers = new Headers({
    'content-type': upstream.headers.get('content-type') ?? 'video/mp4',
    'content-disposition': `attachment; filename="${name}"`,
    'cache-control': 'private, max-age=0',
  })
  for (const headerName of ['accept-ranges', 'content-length', 'content-range']) {
    const value = upstream.headers.get(headerName)
    if (value) headers.set(headerName, value)
  }
  return new Response(upstream.body, { headers, status: upstream.status })
}
