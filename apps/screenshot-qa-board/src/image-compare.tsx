import { ImageOff } from 'lucide-react'
import { useState } from 'react'

import type { ReviewCard } from './review-data'

export function ImageCompare({ card }: { card: ReviewCard }) {
  const [position, setPosition] = useState(50)
  const [failedSources, setFailedSources] = useState<string[]>([])
  const beforeReady = Boolean(card.beforeImage && !failedSources.includes(card.beforeImage))
  const afterReady = Boolean(card.afterImage && !failedSources.includes(card.afterImage))
  const markFailed = (source: string) => setFailedSources((items) => [...items, source])

  if (!beforeReady || !afterReady) {
    return (
      <div className="image-pair" aria-label="Screenshot comparison">
        <ImageTile
          label="Before"
          source={card.beforeImage}
          failed={!beforeReady}
          onError={markFailed}
        />
        <ImageTile
          label="After"
          source={card.afterImage}
          failed={!afterReady}
          onError={markFailed}
        />
      </div>
    )
  }

  return (
    <figure className="compare-canvas">
      <img
        src={card.beforeImage}
        alt={`${card.title}, before`}
        onError={() => markFailed(card.beforeImage)}
      />
      <div className="after-layer" style={{ clipPath: `inset(0 ${100 - position}% 0 0)` }}>
        <img
          src={card.afterImage}
          alt={`${card.title}, after`}
          onError={() => markFailed(card.afterImage)}
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
}: {
  label: string
  source: string
  failed: boolean
  onError: (source: string) => void
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
        </div>
      )}
    </figure>
  )
}
