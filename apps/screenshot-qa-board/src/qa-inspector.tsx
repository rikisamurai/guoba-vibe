import { CheckCircle2, ClipboardCheck, Eye, Image } from 'lucide-react'

import { buildReviewChecklist, type QaStatus } from './lib/qa-board'
import type { ReviewCard } from './review-data'

export function QaInspector({
  card,
  cards,
  statuses,
  onMove,
}: {
  card: ReviewCard
  cards: ReviewCard[]
  statuses: QaStatus[]
  onMove: (status: QaStatus) => void
}) {
  const checklist = buildReviewChecklist(cards)

  return (
    <section className="inspector" aria-label="Selected screenshot review">
      <div className="inspector-head">
        <div>
          <p className="eyebrow">selected capture</p>
          <h2>{card.title}</h2>
        </div>
        <span className={`status-chip ${card.status}`}>{card.status}</span>
      </div>

      <div className="actions" aria-label="Status actions">
        {statuses.map((status) => (
          <button
            key={status}
            type="button"
            className={card.status === status ? 'active' : ''}
            onClick={() => onMove(status)}
          >
            {status === 'accepted' ? <CheckCircle2 size={16} /> : <Eye size={16} />}
            {status}
          </button>
        ))}
      </div>

      <div className="compare">
        <ShotFrame title="Before" tone="before" card={card} image={card.beforeImage} />
        <ShotFrame title="After" tone="after" card={card} image={card.afterImage} />
      </div>

      <aside className="review-note">
        <Image size={17} aria-hidden="true" />
        <div>
          <strong>{card.route}</strong>
          <p>{card.note || 'No note recorded yet.'}</p>
          <span>
            {card.viewport} · {card.severity}
          </span>
        </div>
      </aside>

      <section className="checklist-export" aria-label="Review checklist export">
        <button type="button" onClick={() => void navigator.clipboard?.writeText(checklist)}>
          <ClipboardCheck size={16} aria-hidden="true" />
          Copy checklist
        </button>
        <textarea value={checklist} readOnly />
      </section>
    </section>
  )
}

function ShotFrame({
  title,
  tone,
  card,
  image,
}: {
  title: string
  tone: string
  card: ReviewCard
  image?: string
}) {
  return (
    <article className={`shot-frame ${tone} ${card.severity}`}>
      <header>
        <span>{title}</span>
        <small>{card.viewport}</small>
      </header>
      {image ? (
        <div className="image-path">{image}</div>
      ) : (
        <div className="mock-screen">
          <span />
          <span />
          <span />
          <b />
        </div>
      )}
    </article>
  )
}
