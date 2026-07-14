import { ImageOff } from 'lucide-react'
import { useState } from 'react'

import type { ReviewCard } from './review-data'

export function ImageCompare({ card }: { card: ReviewCard }) {
  const [position, setPosition] = useState(50)
  const [failed, setFailed] = useState({ before: '', after: '' })
  const beforeReady = Boolean(card.beforeImage && failed.before !== card.beforeImage)
  const afterReady = Boolean(card.afterImage && failed.after !== card.afterImage)

  const markFailed = (side: 'before' | 'after', source: string) => {
    setFailed((current) => ({ ...current, [side]: source }))
  }
  const retry = (side: 'before' | 'after') => {
    setFailed((current) => ({ ...current, [side]: '' }))
  }

  if (!beforeReady || !afterReady) {
    return (
      <div className="image-pair" aria-label="Screenshot comparison">
        <ImageTile
          label="Before"
          source={card.beforeImage}
          failed={!beforeReady}
          onError={(source) => markFailed('before', source)}
          onRetry={() => retry('before')}
        />
        <ImageTile
          label="After"
          source={card.afterImage}
          failed={!afterReady}
          onError={(source) => markFailed('after', source)}
          onRetry={() => retry('after')}
        />
      </div>
    )
  }

  return (
    <figure className="compare-canvas">
      <img
        src={card.beforeImage}
        alt={`${card.title}, before`}
        onError={() => markFailed('before', card.beforeImage)}
      />
      <div className="after-layer" style={{ clipPath: `inset(0 ${100 - position}% 0 0)` }}>
        <img
          src={card.afterImage}
          alt={`${card.title}, after`}
          onError={() => markFailed('after', card.afterImage)}
        />
      </div>
      <span className="compare-label before-label">Before</span>
      <span className="compare-label after-label">After</span>
      <i className="compare-divider" style={{ left: `${position}%` }} aria-hidden="true" />
      <input
        type="range"
        min="0"
        max="100"
        value={position}
        aria-label="Before and after comparison divider"
        onChange={(event) => setPosition(Number(event.target.value))}
      />
    </figure>
  )
}

function ImageTile({
  label,
  source,
  failed,
  onError,
  onRetry,
}: {
  label: string
  source: string
  failed: boolean
  onError: (source: string) => void
  onRetry: () => void
}) {
  return (
    <figure className="image-tile">
      <figcaption>{label}</figcaption>
      {source && !failed ? (
        <img src={source} alt={`${label} capture`} onError={() => onError(source)} />
      ) : (
        <div className="image-empty">
          <ImageOff size={22} />
          <strong>{source ? 'Image unavailable' : `No ${label.toLowerCase()} image`}</strong>
          <span>{source ? 'Check the linked URL.' : 'Upload a file or add a URL below.'}</span>
          {source && (
            <button type="button" onClick={onRetry}>
              Retry image
            </button>
          )}
        </div>
      )}
    </figure>
  )
}
