import { cookies } from 'next/headers'

import { DownloaderApp } from '@/components/downloader-app'
import { LoginForm } from '@/components/login-form'
import { isAuthConfigured, SESSION_COOKIE, verifySessionToken } from '@/lib/auth'

export default async function HomePage() {
  const configured = isAuthConfigured()
  const token = (await cookies()).get(SESSION_COOKIE)?.value
  const session = configured ? verifySessionToken(token) : null

  return (
    <main className="app-shell">
      <section className="app-frame">
        {session ? <DownloaderApp /> : <LoginForm ready={configured} />}
      </section>
    </main>
  )
}
