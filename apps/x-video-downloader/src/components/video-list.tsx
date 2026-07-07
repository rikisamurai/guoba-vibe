'use client'

import { Download, Play } from 'lucide-react'

import type { TweetVideo } from '@/lib/media'

type VideoListProps = {
  qualityById: Record<string, string>
  selectedById: Record<string, boolean>
  videos: TweetVideo[]
  onDownload: (video: TweetVideo) => void
  onQualityChange: (videoId: string, variantId: string) => void
  onToggle: (videoId: string) => void
}

export function VideoList({
  onDownload,
  onQualityChange,
  onToggle,
  qualityById,
  selectedById,
  videos,
}: VideoListProps) {
  return (
    <section className="video-section">
      <div className="section-heading">
        <h2>视频</h2>
        <span>{videos.length} 个</span>
      </div>

      <div className="video-stack">
        {videos.map((video, index) => {
          const variantId = qualityById[video.id] ?? video.variants[0]?.id
          const variant = video.variants.find((item) => item.id === variantId) ?? video.variants[0]

          return (
            <article className="video-row" key={video.id}>
              <button
                aria-label={`${selectedById[video.id] ? '取消选择' : '选择'}视频 ${index + 1}`}
                aria-pressed={selectedById[video.id] ?? false}
                className="check-button"
                onClick={() => onToggle(video.id)}
                type="button"
              >
                {(selectedById[video.id] ?? false) ? '✓' : ''}
              </button>

              <div
                aria-label={`视频预览 ${index + 1}`}
                className="preview-box"
                style={
                  video.thumbnail
                    ? { backgroundImage: `url("${video.thumbnail.replaceAll('"', '%22')}")` }
                    : undefined
                }
              >
                {!video.thumbnail && <Play aria-hidden="true" />}
              </div>

              <div className="video-meta">
                <p className="video-title">{video.title || `Video ${index + 1}`}</p>
                <div className="video-actions">
                  <label>
                    <span>Quality</span>
                    <select
                      onChange={(event) => onQualityChange(video.id, event.target.value)}
                      value={variant?.id ?? ''}
                    >
                      {video.variants.map((item, variantIndex) => (
                        <option key={item.id} value={item.id}>
                          {variantIndex === 0 ? '最高 ' : ''}
                          {item.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <button aria-label="下载单个视频" onClick={() => onDownload(video)} type="button">
                    <Download aria-hidden="true" />
                  </button>
                </div>
              </div>
            </article>
          )
        })}
      </div>
    </section>
  )
}
