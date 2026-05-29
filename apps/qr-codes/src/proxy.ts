import { getSessionCookie } from 'better-auth/cookies'
import { NextResponse, type NextRequest } from 'next/server'

export function proxy(req: NextRequest) {
  const sessionCookie = getSessionCookie(req)
  if (!sessionCookie) {
    return NextResponse.redirect(new URL('/login', req.nextUrl))
  }
  return NextResponse.next()
}

export const config = {
  matcher: ['/admin/:path*'],
}
