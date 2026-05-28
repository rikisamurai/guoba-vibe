import 'server-only'
import { and, eq } from 'drizzle-orm'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { cache } from 'react'

import { auth } from '@/auth/server'
import { db } from '@/db/client'
import * as schema from '@/db/schema'
import { env } from '@/env'

/**
 * Returns the better-auth session ONLY if the signed-in user's GitHub numeric ID
 * matches `env.ADMIN_GITHUB_ID`. Returns null for any other case (no cookie,
 * signed in as a different GitHub user, no matching `account` row).
 *
 * Why account.accountId: better-auth's GitHub provider stores GitHub's numeric
 * user id (from https://api.github.com/user) in account.accountId when
 * providerId === "github". That's the stable identifier; the login is mutable.
 *
 * Cookie cache trade-off: server.ts enables a 5-minute cookieCache. That means
 * if you ever rotate ADMIN_GITHUB_ID, the previous admin's cookie stays valid
 * on their browser for up to 5 minutes. Acceptable for a single-admin app.
 *
 * cache() memoizes per-request so nested RSCs sharing this don't re-query.
 */
export const getAdminSession = cache(async () => {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) return null

  const rows = await db
    .select({ accountId: schema.account.accountId })
    .from(schema.account)
    .where(and(eq(schema.account.userId, session.user.id), eq(schema.account.providerId, 'github')))
    .limit(1)

  const githubId = rows[0]?.accountId
  if (!githubId || githubId !== env.ADMIN_GITHUB_ID) return null
  return session
})

export async function requireAdmin() {
  const session = await getAdminSession()
  if (session) return session

  // Distinguish: no cookie at all (→ sign in) vs signed in as non-admin (→ forbidden message).
  const rawSession = await auth.api.getSession({ headers: await headers() })
  redirect(rawSession ? '/login?reason=forbidden' : '/login')
}
