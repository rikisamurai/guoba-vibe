import { CheckCircle2, ClipboardCheck, Eye, Trash2, Wrench } from 'lucide-react'

import { ImageCompare } from './image-compare'
import { ImageInput } from './image-input'
import { buildReviewChecklist, type QaStatus } from './lib/qa-board'
import type { ReviewCard } from './review-data'

export function QaInspector({
  card,
  cards,
  statuses,
  onMove,
  onUpdate,
  onDelete,
  onError,
}: {
  card?: ReviewCard
  cards: ReviewCard[]
  statuses: QaStatus[]
  onMove: (status: QaStatus) => void
  onUpdate: (patch: Partial<ReviewCard>) => void
  onDelete: () => void
  onError: (message: string) => void
}) {
  if (!card) {
    return (
      <section className="inspector inspector-empty">
        <Eye size={28} />
        <h2>No issue selected</h2>
        <p>Create an issue or change the active filter.</p>
      </section>
    )
  }
  const checklist = buildReviewChecklist(cards)

  async function copyChecklist() {
    try {
      await navigator.clipboard.writeText(checklist)
    } catch {
      onError('Clipboard access was denied. Use the export field instead.')
    }
  }

  return (
    <section className="inspector" aria-label="Selected screenshot review">
      <header className="inspector-head">
        <div>
          <p className="eyebrow">comparison canvas</p>
          <h2>{card.title}</h2>
        </div>
        <span className={`status-chip ${card.status}`}>{card.status}</span>
      </header>
      <div className="status-actions" aria-label="Status actions">
        {statuses.map((status) => (
          <button
            key={status}
            type="button"
            className={card.status === status ? 'active' : ''}
            aria-pressed={card.status === status}
            onClick={() => onMove(status)}
          >
            <StatusIcon status={status} /> {status}
          </button>
        ))}
      </div>

      <ImageCompare key={card.id} card={card} />

      <dl className="capture-metadata">
        <Meta label="Route" value={card.route} />
        <Meta label="Viewport" value={card.viewport} />
        <Meta label="Browser" value={card.browser} />
        <Meta label="OS" value={card.os} />
        <Meta label="Captured" value={new Date(card.capturedAt).toLocaleString()} />
        <Meta label="Severity" value={card.severity} />
      </dl>
      <p className="review-note">{card.note || 'No review note recorded.'}</p>

      <details className="source-editor">
        <summary>Manage screenshot sources</summary>
        <div className="source-grid">
          <ImageInput
            label="Before"
            source={card.beforeImage}
            onCommit={(beforeImage) => onUpdate({ beforeImage })}
            onError={onError}
          />
          <ImageInput
            label="After"
            source={card.afterImage}
            onCommit={(afterImage) => onUpdate({ afterImage })}
            onError={onError}
          />
        </div>
      </details>

      <details className="checklist-export">
        <summary>Checklist export</summary>
        <button type="button" onClick={() => void copyChecklist()}>
          <ClipboardCheck size={16} /> Copy checklist
        </button>
        <textarea aria-label="Review checklist" value={checklist} readOnly />
      </details>
      <button type="button" className="delete-issue" onClick={onDelete}>
        <Trash2 size={16} /> Delete issue
      </button>
    </section>
  )
}

function StatusIcon({ status }: { status: QaStatus }) {
  if (status === 'accepted') return <CheckCircle2 size={16} />
  if (status === 'fixed') return <Wrench size={16} />
  return <Eye size={16} />
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  )
}
