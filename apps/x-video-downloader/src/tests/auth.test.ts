import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import {
  createSessionToken,
  isAuthConfigured,
  readSessionFromCookieHeader,
  SESSION_COOKIE,
  verifyInviteCode,
  verifySessionToken,
} from '@/lib/auth'

const OLD_ENV = process.env

describe('invite session auth', () => {
  beforeEach(() => {
    process.env = { ...OLD_ENV, XVD_INVITE_CODES: 'alpha,beta', XVD_SESSION_SECRET: 'secret' }
  })

  afterEach(() => {
    process.env = OLD_ENV
  })

  it('checks invite codes from env', () => {
    expect(isAuthConfigured()).toBe(true)
    expect(verifyInviteCode('alpha')).toBe(true)
    expect(verifyInviteCode('gamma')).toBe(false)
  })

  it('creates and verifies signed session tokens', () => {
    const token = createSessionToken('alpha', 1000)
    expect(verifySessionToken(token, 2000)?.codeHash).toBeTruthy()
    expect(verifySessionToken(`${token}x`, 2000)).toBeNull()
    expect(verifySessionToken(token, 8 * 24 * 60 * 60 * 1000)).toBeNull()
  })

  it('reads the signed token from a cookie header', () => {
    const token = createSessionToken('beta')
    const session = readSessionFromCookieHeader(`theme=dark; ${SESSION_COOKIE}=${token}`)
    expect(session?.codeHash).toBeTruthy()
  })
})
