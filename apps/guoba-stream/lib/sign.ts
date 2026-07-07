import { createHmac, timingSafeEqual } from 'node:crypto'

const ALLOWED_HOST = 'video.twimg.com'

export function signDownload(
  rawUrl: string,
  filename: string,
  expiresAtSec: number,
  secret: string,
): string {
  const mac = createHmac('sha256', secret)
  mac.update(JSON.stringify([rawUrl, filename, expiresAtSec]))
  return mac.digest('hex')
}

export function buildDownloadPath(
  rawUrl: string,
  filename: string,
  expiresAtSec: number,
  secret: string,
): string {
  const sig = signDownload(rawUrl, filename, expiresAtSec, secret)
  const params = new URLSearchParams({
    url: rawUrl,
    name: filename,
    exp: String(expiresAtSec),
    sig,
  })
  return `/api/download?${params.toString()}`
}

export type VerifyResult = 'ok' | 'expired' | 'bad_signature' | 'bad_url'

export function verifyDownload(
  rawUrl: string,
  filename: string,
  expiresAtSec: number,
  sig: string,
  secret: string,
  nowSec: number,
): VerifyResult {
  let parsed: URL
  try {
    parsed = new URL(rawUrl)
  } catch {
    return 'bad_url'
  }
  if (parsed.protocol !== 'https:' || parsed.hostname !== ALLOWED_HOST) return 'bad_url'
  const expected = Buffer.from(signDownload(rawUrl, filename, expiresAtSec, secret), 'hex')
  const provided = Buffer.from(sig, 'hex')
  if (expected.length !== provided.length || !timingSafeEqual(expected, provided))
    return 'bad_signature'
  if (expiresAtSec < nowSec) return 'expired'
  return 'ok'
}
