import { AlertTriangle, PanelTop, SlidersHorizontal } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'

import { parseQaCards, summarizeBoard, transitionCardStatus, type QaStatus } from './lib/qa-board'
import { QaComposer } from './qa-composer'
import { QaInspector } from './qa-inspector'
import {
  initialCards,
  severities,
  statuses,
  type ReviewCard,
  type SeverityFilter,
} from './review-data'

const storageKey = 'screenshot-qa-board-cards-v1'

function readInitialCards() {
  if (typeof window === 'undefined') {
    return initialCards
  }

  const stored = window.localStorage.getItem(storageKey)
  return stored ? ((parseQaCards(stored) as ReviewCard[] | null) ?? initialCards) : initialCards
}

export function App() {
  const [cards, setCards] = useState(readInitialCards)
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

  function addCard(card: ReviewCard) {
    setCards((current) => [card, ...current.filter((item) => item.id !== card.id)])
    setSelectedId(card.id)
    setFilter('all')
  }

  useEffect(() => {
    window.localStorage.setItem(storageKey, JSON.stringify(cards))
  }, [cards])

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

        <QaComposer onCreate={addCard} />

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

          <QaInspector
            card={selectedCard}
            cards={cards}
            statuses={statuses}
            onMove={moveSelected}
          />
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
