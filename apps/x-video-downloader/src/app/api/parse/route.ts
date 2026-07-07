import { NextResponse, type NextRequest } from 'next/server'

import { isResponse, jsonError, requireSession } from '@/lib/api'
import { readJsonObject } from '@/lib/json'
import { checkRateLimit } from '@/lib/rate-limit'
import { parsePostUrl } from '@/lib/url'
import { getYtDlpInfo, normalizeYtDlpInfo } from '@/lib/ytdlp'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const activeParses = new Map<string, number>()

export async function POST(request: NextRequest) {
  const session = requireSession(request)
  if (isResponse(session)) return session

  const limited = checkRateLimit(`parse:${session.codeHash}`, { limit: 12, windowMs: 60_000 })
  if (!limited.allowed) {
    return jsonError(`解析太频繁，请 ${limited.retryAfter} 秒后再试`, 429)
  }

  if ((activeParses.get(session.codeHash) ?? 0) >= 2) {
    return jsonError('已有解析任务在运行，请稍后再试', 429)
  }

  activeParses.set(session.codeHash, (activeParses.get(session.codeHash) ?? 0) + 1)
  try {
    const body = await readJsonObject(request)
    const post = parsePostUrl(typeof body?.url === 'string' ? body.url : '')
    const rawInfo = await getYtDlpInfo(post.normalizedUrl)
    const videos = normalizeYtDlpInfo(rawInfo, `${post.username}/${post.statusId}`)
    if (videos.length === 0) {
      return jsonError('解析器未识别到视频，请确认这条推文包含可公开访问的视频', 400)
    }
    return NextResponse.json({ post, videos })
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : '解析失败', 400)
  } finally {
    const nextCount = (activeParses.get(session.codeHash) ?? 1) - 1
    if (nextCount <= 0) activeParses.delete(session.codeHash)
    else activeParses.set(session.codeHash, nextCount)
  }
}
