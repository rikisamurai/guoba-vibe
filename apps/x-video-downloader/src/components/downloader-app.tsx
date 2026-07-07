'use client'

import { Download, Link2, Loader2, LogOut, Search } from 'lucide-react'
import { useMemo, useState } from 'react'

import { getErrorMessage, isRecord } from '@/lib/json'
import type { ParseResponse, TweetVideo, VideoVariant } from '@/lib/media'

import { VideoList } from './video-list'

async function logout() {
  await fetch('/api/session', { method: 'DELETE' })
  window.location.reload()
}

export function DownloaderApp() {
  const [data, setData] = useState<ParseResponse | null>(null)
  const [message, setMessage] = useState('粘贴推文链接')
  const [qualityById, setQualityById] = useState<Record<string, string>>({})
  const [selectedById, setSelectedById] = useState<Record<string, boolean>>({})
  const [submitting, setSubmitting] = useState(false)
  const [url, setUrl] = useState('')

  const selectedVideos = useMemo(
    () => data?.videos.filter((video) => selectedById[video.id]) ?? [],
    [data, selectedById],
  )

  async function parse(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSubmitting(true)
    setMessage('解析中')

    const response = await fetch('/api/parse', {
      body: JSON.stringify({ url }),
      headers: { 'Content-Type': 'application/json' },
      method: 'POST',
    })
    const payload: unknown = await response.json().catch(() => null)
    setSubmitting(false)

    if (!response.ok || !isParseResponse(payload)) {
      setMessage(getErrorMessage(payload, '解析失败'))
      return
    }

    setData(payload)
    setSelectedById(Object.fromEntries(payload.videos.map((video) => [video.id, true])))
    setQualityById(
      Object.fromEntries(payload.videos.map((video) => [video.id, video.variants[0]?.id ?? ''])),
    )
    setMessage(
      payload.videos.length === 1 ? '识别到 1 个视频' : `识别到 ${payload.videos.length} 个视频`,
    )
  }

  function toggleAll() {
    if (!data) return
    const shouldSelect = selectedVideos.length !== data.videos.length
    setSelectedById(Object.fromEntries(data.videos.map((video) => [video.id, shouldSelect])))
  }

  function selectedVariant(video: TweetVideo): VideoVariant | undefined {
    return (
      video.variants.find((variant) => variant.id === qualityById[video.id]) ?? video.variants[0]
    )
  }

  function downloadVideos(videos: TweetVideo[]) {
    videos
      .map((video) => selectedVariant(video))
      .filter((variant): variant is VideoVariant => Boolean(variant))
      .forEach((variant) => {
        const file = `${data?.post.statusId ?? 'x'}-${variant.label}.mp4`
        const query = new URLSearchParams({ filename: file, url: variant.url })
        window.open(`/api/download?${query.toString()}`, '_blank', 'noopener,noreferrer')
      })
  }

  return (
    <div className="tool-view">
      <header className="topbar">
        <div>
          <p className="eyebrow">Private</p>
          <h1>Video Link</h1>
        </div>
        <button aria-label="退出登录" className="icon-button" onClick={logout} type="button">
          <LogOut aria-hidden="true" />
        </button>
      </header>

      <form className="parse-panel" onSubmit={parse}>
        <label htmlFor="post-url">粘贴推文链接</label>
        <div className="input-row">
          <Link2 aria-hidden="true" />
          <input
            id="post-url"
            aria-label="粘贴推文链接"
            onChange={(event) => setUrl(event.target.value)}
            placeholder="https://x.com/user/status/..."
            type="url"
            value={url}
          />
        </div>
        <button className="primary-button" disabled={submitting || !url.trim()} type="submit">
          {submitting ? (
            <Loader2 aria-hidden="true" className="spin" />
          ) : (
            <Search aria-hidden="true" />
          )}
          解析
        </button>
        <div className="status-line">
          <span>{message}</span>
          {data && <code>{data.post.normalizedUrl}</code>}
        </div>
      </form>

      {data && (
        <VideoList
          onDownload={(video) => downloadVideos([video])}
          onQualityChange={(videoId, variantId) =>
            setQualityById((current) => ({ ...current, [videoId]: variantId }))
          }
          onToggle={(videoId) =>
            setSelectedById((current) => ({ ...current, [videoId]: !current[videoId] }))
          }
          qualityById={qualityById}
          selectedById={selectedById}
          videos={data.videos}
        />
      )}

      <footer className="download-bar">
        <button
          className="link-button"
          disabled={!data?.videos.length}
          onClick={toggleAll}
          type="button"
        >
          全部
        </button>
        <span>已选 {selectedVideos.length} 个</span>
        <button
          className="primary-button compact"
          disabled={selectedVideos.length === 0}
          onClick={() => downloadVideos(selectedVideos)}
          type="button"
        >
          <Download aria-hidden="true" />
          下载选中
        </button>
      </footer>
    </div>
  )
}

function isParseResponse(value: unknown): value is ParseResponse {
  return isRecord(value) && isRecord(value.post) && Array.isArray(value.videos)
}
