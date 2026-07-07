import 'server-only'
import { createHash, createHmac, timingSafeEqual } from 'node:crypto'

export const SESSION_COOKIE = 'xvd_session'

const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000

type SessionPayload = {
  codeHash: string
  exp: number
  iat: number
}

export type Session = SessionPayload

export class AuthConfigError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'AuthConfigError'
  }
}

export function isAuthConfigured(): boolean {
  return getInviteCodes().length > 0 && Boolean(process.env.XVD_SESSION_SECRET)
}

export function verifyInviteCode(code: string): boolean {
  const codeHash = hashText(code.trim())
  return getInviteCodes().some((candidate) => safeEqual(hashText(candidate), codeHash))
}

export function createSessionToken(code: string, now = Date.now()): string {
  const payload: SessionPayload = {
    codeHash: hashText(code.trim()),
    exp: now + SESSION_TTL_MS,
    iat: now,
  }
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString('base64url')
  return `${encodedPayload}.${sign(encodedPayload)}`
}

export function verifySessionToken(token: string | undefined, now = Date.now()): Session | null {
  if (!token) return null

  const [encodedPayload, signature] = token.split('.')
  if (!encodedPayload || !signature || !safeEqual(sign(encodedPayload), signature)) return null

  try {
    const payload: unknown = JSON.parse(Buffer.from(encodedPayload, 'base64url').toString())
    if (!isSessionPayload(payload) || payload.exp < now) return null
    return payload
  } catch {
    return null
  }
}

export function readSessionFromCookieHeader(cookieHeader: string | null): Session | null {
  const token = cookieHeader
    ?.split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${SESSION_COOKIE}=`))
    ?.slice(SESSION_COOKIE.length + 1)
  return verifySessionToken(token)
}

function getInviteCodes(): string[] {
  return (process.env.XVD_INVITE_CODES ?? '')
    .split(',')
    .map((code) => code.trim())
    .filter(Boolean)
}

function hashText(value: string): string {
  return createHash('sha256').update(value).digest('base64url')
}

function sign(value: string): string {
  const secret = process.env.XVD_SESSION_SECRET
  if (!secret) throw new AuthConfigError('XVD_SESSION_SECRET is required')
  return createHmac('sha256', secret).update(value).digest('base64url')
}

function safeEqual(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left)
  const rightBuffer = Buffer.from(right)
  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer)
}

function isSessionPayload(value: unknown): value is SessionPayload {
  return (
    typeof value === 'object' &&
    value !== null &&
    'codeHash' in value &&
    'exp' in value &&
    'iat' in value &&
    typeof value.codeHash === 'string' &&
    typeof value.exp === 'number' &&
    typeof value.iat === 'number'
  )
}
