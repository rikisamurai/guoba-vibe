import { ImageOff, SlidersHorizontal } from 'lucide-react'

import { severities, type ReviewCard, type SeverityFilter } from './review-data'

export function IssueQueue({
  cards,
  filter,
  selectedId,
  onFilter,
  onSelect,
}: {
  cards: ReviewCard[]
  filter: SeverityFilter
  selectedId?: string
  onFilter: (filter: SeverityFilter) => void
  onSelect: (id: string) => void
}) {
  return (
    <aside className="issue-queue" aria-label="Visual issue queue">
      <div className="queue-head">
        <div>
          <p className="eyebrow">issue queue</p>
          <h2>{cards.length} visible</h2>
        </div>
        <SlidersHorizontal size={18} aria-hidden="true" />
      </div>
      <nav className="severity-filter" aria-label="Severity filters">
        {severities.map((severity) => (
          <button
            key={severity}
            type="button"
            className={filter === severity ? 'active' : ''}
            onClick={() => onFilter(severity)}
          >
            {severity}
          </button>
        ))}
      </nav>
      <div className="queue-list">
        {cards.map((card) => (
          <IssueButton
            key={card.id}
            card={card}
            selected={card.id === selectedId}
            onSelect={() => onSelect(card.id)}
          />
        ))}
        {!cards.length && (
          <div className="queue-empty">
            <ImageOff size={22} />
            <strong>No matching issues</strong>
            <span>Change the severity filter or create a capture.</span>
          </div>
        )}
      </div>
    </aside>
  )
}

function IssueButton({
  card,
  selected,
  onSelect,
}: {
  card: ReviewCard
  selected: boolean
  onSelect: () => void
}) {
  const preview = card.afterImage || card.beforeImage
  return (
    <button
      type="button"
      className={`issue-card ${card.severity} ${selected ? 'selected' : ''}`}
      onClick={onSelect}
    >
      <span className="queue-preview">
        {preview ? <img src={preview} alt="" /> : <ImageOff size={17} aria-hidden="true" />}
      </span>
      <span className="issue-copy">
        <span className="issue-topline">
          <i>{card.severity}</i>
          <b className={card.status}>{card.status}</b>
        </span>
        <strong>{card.title}</strong>
        <small>
          {card.route} · {card.viewport}
        </small>
      </span>
    </button>
  )
}
