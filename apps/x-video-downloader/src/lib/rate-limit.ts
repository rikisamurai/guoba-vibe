import 'server-only'

type Bucket = {
  count: number
  resetAt: number
}

const buckets = new Map<string, Bucket>()

export function checkRateLimit(
  key: string,
  options: { limit: number; now?: number; windowMs: number },
): { allowed: true } | { allowed: false; retryAfter: number } {
  const now = options.now ?? Date.now()
  const existing = buckets.get(key)

  if (!existing || existing.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + options.windowMs })
    return { allowed: true }
  }

  if (existing.count >= options.limit) {
    return { allowed: false, retryAfter: Math.ceil((existing.resetAt - now) / 1000) }
  }

  existing.count += 1
  return { allowed: true }
}
