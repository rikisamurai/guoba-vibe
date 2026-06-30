import { AlertTriangle, CheckCircle2, Eye, Image, PanelTop, SlidersHorizontal } from 'lucide-react'
import { useMemo, useState } from 'react'

import { summarizeBoard, transitionCardStatus, type QaStatus } from './lib/qa-board'
import {
  initialCards,
  severities,
  statuses,
  type ReviewCard,
  type SeverityFilter,
} from './review-data'

export function App() {
  const [cards, setCards] = useState(initialCards)
  const [filter, setFilter] = useState<SeverityFilter>('all')
  const [selectedId, setSelectedId] = useState(cards[0].id)
  const summary = summarizeBoard(cards)
  const visibleCards = useMemo(
    () => cards.filter((card) => filter === 'all' || card.severity === filter),
    [cards, filter],
  )
  const selectedCard = cards.find((card) => card.id === selectedId) ?? visibleCards[0] ?? cards[0]

  function moveSelected(status: QaStatus) {
    setCards((current) => transitionCardStatus(current, selectedCard.id, status) as ReviewCard[])
  }

  return (
    <main className="page">
      <section className="board" aria-label="Screenshot QA Board">
        <header className="topbar">
          <div>
            <p className="eyebrow">visual review</p>
            <h1>Screenshot QA Board</h1>
          </div>
          <div className="blocker-pill">
            <AlertTriangle size={17} aria-hidden="true" />
            {summary.highSeverityOpen} high open
          </div>
        </header>

        <section className="metrics" aria-label="QA counts">
          <Metric label="Total" value={summary.total} />
          <Metric label="Open" value={summary.open} />
          <Metric label="Fixed" value={summary.fixed} />
          <Metric label="Accepted" value={summary.accepted} />
        </section>

        <nav className="severity-filter" aria-label="Severity filters">
          <SlidersHorizontal size={16} aria-hidden="true" />
          {severities.map((item) => (
            <button
              key={item}
              type="button"
              className={filter === item ? 'active' : ''}
              onClick={() => setFilter(item)}
            >
              {item}
            </button>
          ))}
        </nav>

        <div className="workspace">
          <section className="columns" aria-label="Review lanes">
            {statuses.map((status) => (
              <article key={status} className="column">
                <h2>{status}</h2>
                <div className="card-stack">
                  {visibleCards
                    .filter((card) => card.status === status)
                    .map((card) => (
                      <QaCardButton
                        key={card.id}
                        card={card}
                        selected={card.id === selectedCard.id}
                        onSelect={() => setSelectedId(card.id)}
                      />
                    ))}
                </div>
              </article>
            ))}
          </section>

          <section className="inspector" aria-label="Selected screenshot review">
            <div className="inspector-head">
              <div>
                <p className="eyebrow">selected capture</p>
                <h2>{selectedCard.title}</h2>
              </div>
              <span className={`status-chip ${selectedCard.status}`}>{selectedCard.status}</span>
            </div>

            <div className="actions" aria-label="Status actions">
              {statuses.map((status) => (
                <button
                  key={status}
                  type="button"
                  className={selectedCard.status === status ? 'active' : ''}
                  onClick={() => moveSelected(status)}
                >
                  {status === 'accepted' ? <CheckCircle2 size={16} /> : <Eye size={16} />}
                  {status}
                </button>
              ))}
            </div>

            <div className="compare">
              <ShotFrame title="Before" tone="before" card={selectedCard} />
              <ShotFrame title="After" tone="after" card={selectedCard} />
            </div>

            <aside className="review-note">
              <Image size={17} aria-hidden="true" />
              <div>
                <strong>{selectedCard.route}</strong>
                <p>{selectedCard.note}</p>
                <span>
                  {selectedCard.viewport} · {selectedCard.severity}
                </span>
              </div>
            </aside>
          </section>
        </div>
      </section>
    </main>
  )
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="metric">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  )
}

function QaCardButton({
  card,
  selected,
  onSelect,
}: {
  card: ReviewCard
  selected: boolean
  onSelect: () => void
}) {
  return (
    <button
      type="button"
      className={`qa-card ${card.severity} ${selected ? 'selected' : ''}`}
      onClick={onSelect}
    >
      <ShotMini card={card} />
      <span>
        <strong>{card.title}</strong>
        <small>{card.route}</small>
      </span>
    </button>
  )
}

function ShotMini({ card }: { card: ReviewCard }) {
  return (
    <div className={`shot-mini ${card.status}`} aria-hidden="true">
      <PanelTop size={12} />
      <i />
      <b />
    </div>
  )
}

function ShotFrame({ title, tone, card }: { title: string; tone: string; card: ReviewCard }) {
  return (
    <article className={`shot-frame ${tone} ${card.severity}`}>
      <header>
        <span>{title}</span>
        <small>{card.viewport}</small>
      </header>
      <div className="mock-screen">
        <span />
        <span />
        <span />
        <b />
      </div>
    </article>
  )
}
