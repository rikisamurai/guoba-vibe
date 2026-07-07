import { Flame } from 'lucide-react'
import { useState } from 'react'

import type { ResolvedTweet, ResolveErrorCode } from '../lib/types'
import { ErrorBanner } from './components/error-banner'
import { Gate } from './components/gate'
import { UrlForm } from './components/url-form'
import { clearAccessKey, loadAccessKey, saveAccessKey } from './lib/access-key'
import { resolveTweet } from './lib/api'

export function App() {
  const [accessKey, setAccessKey] = useState<string | null>(() => loadAccessKey())
  const [tweet, setTweet] = useState<ResolvedTweet | null>(null)
  const [errorCode, setErrorCode] = useState<ResolveErrorCode | null>(null)
  const [loading, setLoading] = useState(false)

  if (!accessKey) {
    return (
      <Gate
        onUnlocked={(key) => {
          saveAccessKey(key)
          setAccessKey(key)
        }}
      />
    )
  }

  const handleFetch = async (url: string) => {
    setLoading(true)
    setErrorCode(null)
    setTweet(null)
    const outcome = await resolveTweet(url, accessKey)
    setLoading(false)
    if (outcome.status === 'unauthorized') {
      clearAccessKey()
      setAccessKey(null)
      return
    }
    if (outcome.status === 'error') {
      setErrorCode(outcome.code)
      return
    }
    setTweet(outcome.tweet)
  }

  return (
    <div className="mx-auto flex min-h-dvh max-w-3xl flex-col px-4 pt-6">
      <header className="mb-5 flex items-center gap-2">
        <Flame className="text-ember size-5" aria-hidden />
        <span className="font-display text-xl font-semibold">
          guoba<span className="text-ember">stream</span>
        </span>
      </header>
      <UrlForm loading={loading} onSubmit={(url) => void handleFetch(url)} />
      {errorCode && <ErrorBanner code={errorCode} />}
      {tweet && (
        <p className="text-husk mt-4 text-sm">@{tweet.authorHandle} — media cards land next</p>
      )}
    </div>
  )
}
