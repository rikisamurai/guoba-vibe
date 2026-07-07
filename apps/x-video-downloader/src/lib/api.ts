import 'server-only'
import { NextResponse, type NextRequest } from 'next/server'

import { AuthConfigError, readSessionFromCookieHeader, type Session } from './auth'

export function requireSession(request: NextRequest): Session | NextResponse {
  try {
    const session = readSessionFromCookieHeader(request.headers.get('cookie'))
    if (session) return session
    return NextResponse.json({ error: '请先输入邀请码' }, { status: 401 })
  } catch (error) {
    if (error instanceof AuthConfigError) {
      return NextResponse.json({ error: '服务端未配置登录密钥' }, { status: 500 })
    }
    throw error
  }
}

export function jsonError(message: string, status: number): NextResponse {
  return NextResponse.json({ error: message }, { status })
}

export function isResponse(value: Session | NextResponse): value is NextResponse {
  return value instanceof NextResponse
}
