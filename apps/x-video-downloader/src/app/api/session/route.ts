import { NextResponse, type NextRequest } from 'next/server'

import {
  AuthConfigError,
  createSessionToken,
  isAuthConfigured,
  SESSION_COOKIE,
  verifyInviteCode,
} from '@/lib/auth'
import { readJsonObject } from '@/lib/json'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  if (!isAuthConfigured()) {
    return NextResponse.json({ error: '服务端未配置邀请码' }, { status: 500 })
  }

  const body = await readJsonObject(request)
  const code = typeof body?.code === 'string' ? body.code.trim() : ''
  if (!code || !verifyInviteCode(code)) {
    return NextResponse.json({ error: '邀请码无效' }, { status: 401 })
  }

  try {
    const response = NextResponse.json({ ok: true })
    response.cookies.set(SESSION_COOKIE, createSessionToken(code), {
      httpOnly: true,
      maxAge: 7 * 24 * 60 * 60,
      path: '/',
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
    })
    return response
  } catch (error) {
    if (error instanceof AuthConfigError) {
      return NextResponse.json({ error: '服务端未配置登录密钥' }, { status: 500 })
    }
    throw error
  }
}

export function DELETE() {
  const response = NextResponse.json({ ok: true })
  response.cookies.set(SESSION_COOKIE, '', { maxAge: 0, path: '/' })
  return response
}
