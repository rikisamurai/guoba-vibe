import { Flame } from 'lucide-react'
import { useState } from 'react'

import type { ResolvedTweet, ResolveErrorCode } from '../lib/types'
import { DownloadBar } from './components/download-bar'
import { EmptyState } from './components/empty-state'
import { ErrorBanner } from './components/error-banner'
import { Gate } from './components/gate'
import { MediaCard } from './components/media-card'
import { ResultSkeleton } from './components/result-skeleton'
import { TweetCard } from './components/tweet-card'
import { UrlForm } from './components/url-form'
import { clearAccessKey, loadAccessKey, saveAccessKey } from './lib/access-key'
import { resolveTweet } from './lib/api'
import { downloadSequentially } from './lib/download'

export function App() {
  const [accessKey, setAccessKey] = useState<string | null>(() => loadAccessKey())
  const [tweet, setTweet] = useState<ResolvedTweet | null>(null)
  const [errorCode, setErrorCode] = useState<ResolveErrorCode | null>(null)
  const [loading, setLoading] = useState(false)
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [variantChoice, setVariantChoice] = useState<Record<number, number>>({})

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
    setSelected(new Set(outcome.tweet.media.map((media) => media.index)))
    setVariantChoice({})
  }

  const toggleSelected = (index: number) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(index)) next.delete(index)
      else next.add(index)
      return next
    })
  }

  const downloadSelected = () => {
    if (!tweet) return
    const hrefs = tweet.media
      .filter((media) => selected.has(media.index))
      .map((media) => media.variants[variantChoice[media.index] ?? 0].downloadUrl)
    void downloadSequentially(hrefs)
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
      {loading && <ResultSkeleton />}
      {!loading && !tweet && !errorCode && <EmptyState />}
      {tweet && (
        <>
          <TweetCard tweet={tweet} />
          <div className="grid gap-3 pb-28 sm:grid-cols-2">
            {tweet.media.map((media) => (
              <MediaCard
                key={media.index}
                media={media}
                selected={selected.has(media.index)}
                variantIndex={variantChoice[media.index] ?? 0}
                onToggleSelected={() => toggleSelected(media.index)}
                onVariantChange={(index) =>
                  setVariantChoice((prev) => ({ ...prev, [media.index]: index }))
                }
              />
            ))}
          </div>
          <DownloadBar
            total={tweet.media.length}
            selectedCount={selected.size}
            onDownload={downloadSelected}
          />
        </>
      )}
    </div>
  )
}
