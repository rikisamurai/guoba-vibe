import { NextResponse, type NextRequest } from 'next/server'

import { isResponse, jsonError, requireSession } from '@/lib/api'
import { checkRateLimit } from '@/lib/rate-limit'
import { isAllowedMediaUrl } from '@/lib/url'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const DOWNLOAD_HEADERS = {
  Accept: '*/*',
  'Accept-Language': 'en-us,en;q=0.5',
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36',
}

export async function GET(request: NextRequest) {
  const session = requireSession(request)
  if (isResponse(session)) return session

  const limited = checkRateLimit(`download:${session.codeHash}`, { limit: 60, windowMs: 60_000 })
  if (!limited.allowed) {
    return jsonError(`下载太频繁，请 ${limited.retryAfter} 秒后再试`, 429)
  }

  const mediaUrl = request.nextUrl.searchParams.get('url') ?? ''
  if (!isAllowedMediaUrl(mediaUrl)) return jsonError('下载地址无效', 400)

  const range = request.headers.get('range')
  const upstream = await fetch(mediaUrl, {
    headers: range ? { ...DOWNLOAD_HEADERS, Range: range } : DOWNLOAD_HEADERS,
  })

  if (!upstream.ok || !upstream.body) return jsonError('视频源下载失败', upstream.status)

  const headers = new Headers({
    'Cache-Control': 'no-store',
    'Content-Disposition': `attachment; filename="${filename(request)}"`,
    'Content-Type': upstream.headers.get('content-type') ?? 'video/mp4',
  })

  copyHeader(upstream.headers, headers, 'accept-ranges')
  copyHeader(upstream.headers, headers, 'content-length')
  copyHeader(upstream.headers, headers, 'content-range')

  return new NextResponse(upstream.body, { headers, status: upstream.status })
}

function filename(request: NextRequest): string {
  const raw = request.nextUrl.searchParams.get('filename') ?? 'x-video.mp4'
  const clean = raw.replace(/[^A-Za-z0-9._-]/g, '-').replace(/-+/g, '-')
  return clean.endsWith('.mp4') ? clean : `${clean}.mp4`
}

function copyHeader(from: Headers, to: Headers, name: string) {
  const value = from.get(name)
  if (value) to.set(name, value)
}
