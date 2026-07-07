import { Check, Download, ExternalLink, Play } from 'lucide-react'
import { useState } from 'react'

import type { MediaItem } from '../../lib/types'
import { formatDuration } from '../lib/format'

interface MediaCardProps {
  media: MediaItem
  selected: boolean
  variantIndex: number
  onToggleSelected: () => void
  onVariantChange: (index: number) => void
}

export function MediaCard({
  media,
  selected,
  variantIndex,
  onToggleSelected,
  onVariantChange,
}: MediaCardProps) {
  const [playing, setPlaying] = useState(false)
  const variant = media.variants[variantIndex] ?? media.variants[0]

  return (
    <article className="border-crust bg-pan overflow-hidden rounded-xl border">
      <div className="bg-pan-deep relative aspect-video">
        {playing ? (
          <video
            key={variant.rawUrl}
            src={variant.rawUrl}
            poster={media.thumbnailUrl}
            controls
            autoPlay
            playsInline
            loop={media.kind === 'gif'}
            className="h-full w-full"
          />
        ) : (
          <button
            type="button"
            onClick={() => setPlaying(true)}
            aria-label="Play preview"
            className="block h-full w-full"
          >
            <img
              src={media.thumbnailUrl}
              alt=""
              referrerPolicy="no-referrer"
              className="h-full w-full object-cover"
            />
            <span className="bg-ember absolute inset-0 m-auto flex size-11 items-center justify-center rounded-full">
              <Play className="text-ember-ink size-5" aria-hidden />
            </span>
          </button>
        )}
        <button
          type="button"
          onClick={onToggleSelected}
          aria-pressed={selected}
          aria-label={selected ? 'Deselect' : 'Select'}
          className={`absolute top-2 left-2 flex size-8 items-center justify-center rounded-md ${
            selected ? 'bg-ember' : 'border-seam-strong bg-pan-deep/70 border-2'
          }`}
        >
          {selected && <Check className="text-ember-ink size-4" aria-hidden />}
        </button>
        {media.kind === 'gif' && (
          <span className="bg-crust text-ember-soft absolute top-2 right-2 rounded-md px-2 py-0.5 text-xs font-medium">
            GIF
          </span>
        )}
        {media.durationMs !== null && !playing && (
          <span className="bg-pan-deep/90 text-husk absolute right-2 bottom-2 rounded-md px-2 py-0.5 text-xs">
            {formatDuration(media.durationMs)}
          </span>
        )}
      </div>
      <div className="flex items-center gap-2 p-2.5">
        {media.variants.length > 1 ? (
          <select
            value={variantIndex}
            onChange={(e) => onVariantChange(Number(e.target.value))}
            aria-label="Quality"
            className="border-seam bg-pan h-9 rounded-md border px-2 text-sm"
          >
            {media.variants.map((option, index) => (
              <option key={option.rawUrl} value={index}>
                {option.label}
              </option>
            ))}
          </select>
        ) : (
          <span className="text-bran px-1 text-sm">{variant.label}</span>
        )}
        <span className="flex-1" />
        <a
          href={variant.rawUrl}
          target="_blank"
          rel="noreferrer noopener"
          aria-label="Open raw link"
          className="border-seam text-bran flex size-9 items-center justify-center rounded-md border"
        >
          <ExternalLink className="size-4" aria-hidden />
        </a>
        <a
          href={variant.downloadUrl}
          download
          className="bg-ember text-ember-ink flex h-9 items-center gap-1.5 rounded-md px-3 text-sm font-medium"
        >
          <Download className="size-4" aria-hidden />
          Save
        </a>
      </div>
    </article>
  )
}
