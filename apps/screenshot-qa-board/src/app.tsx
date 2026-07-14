import { AlertTriangle, X } from 'lucide-react'
import { useMemo, useState } from 'react'

import { BoardActions } from './board-actions'
import { IssueQueue } from './issue-queue'
import { loadBoard, saveBoard } from './lib/board-storage'
import {
  summarizeBoard,
  transitionCardStatus,
  updateQaCard,
  type QaCard,
  type QaStatus,
} from './lib/qa-board'
import { QaComposer } from './qa-composer'
import { QaInspector } from './qa-inspector'
import { initialCards, statuses, type ReviewCard, type SeverityFilter } from './review-data'

type InitialState = { cards: ReviewCard[]; error: string }

function readInitialState(): InitialState {
  if (typeof window === 'undefined') return { cards: initialCards, error: '' }
  const result = loadBoard(window.localStorage)
  return { cards: result.cards ?? initialCards, error: result.error }
}

export function App() {
  const [initial] = useState(readInitialState)
  const [cards, setCards] = useState(initial.cards)
  const [filter, setFilter] = useState<SeverityFilter>('all')
  const [selectedId, setSelectedId] = useState(cards[0]?.id)
  const [notice, setNotice] = useState(initial.error)
  const summary = summarizeBoard(cards)
  const visibleCards = useMemo(
    () => cards.filter((card) => filter === 'all' || card.severity === filter),
    [cards, filter],
  )
  const selectedCard = visibleCards.find((card) => card.id === selectedId) ?? visibleCards[0]

  function commitCards(next: ReviewCard[], successMessage = '') {
    const result = saveBoard(window.localStorage, next)
    if (!result.ok) {
      setNotice(result.error)
      return false
    }
    setCards(next)
    setNotice(successMessage)
    return true
  }

  function addCard(card: ReviewCard) {
    const saved = commitCards([card, ...cards], 'Issue added and saved locally.')
    if (saved) {
      setSelectedId(card.id)
      setFilter('all')
    }
    return saved
  }

  function moveSelected(status: QaStatus) {
    if (!selectedCard) return
    commitCards(transitionCardStatus(cards, selectedCard.id, status), `Issue marked ${status}.`)
  }

  function updateSelected(patch: Partial<QaCard>) {
    if (!selectedCard) return
    commitCards(updateQaCard(cards, selectedCard.id, patch), 'Screenshot source saved.')
  }

  function deleteSelected() {
    if (!selectedCard) return
    const next = cards.filter((card) => card.id !== selectedCard.id)
    if (commitCards(next, 'Issue deleted.')) setSelectedId(next[0]?.id)
  }

  function importBoard(next: QaCard[]) {
    if (commitCards(next, `Imported ${next.length} issues.`)) {
      setFilter('all')
      setSelectedId(next[0]?.id)
    }
  }

  return (
    <main className="page">
      <section className="board" aria-label="Screenshot QA Board">
        <header className="topbar">
          <div>
            <p className="eyebrow">visual release control</p>
            <h1>Screenshot QA Board</h1>
            <p className="dek">Evidence-first UI review with durable capture context.</p>
          </div>
          <div className="blocker-pill">
            <AlertTriangle size={17} />
            {summary.highSeverityOpen} high open
          </div>
        </header>

        <section className="command-bar">
          <div className="metrics" aria-label="QA counts">
            <Metric label="Total" value={summary.total} />
            <Metric label="Open" value={summary.open} />
            <Metric label="Fixed" value={summary.fixed} />
            <Metric label="Accepted" value={summary.accepted} />
          </div>
          <BoardActions
            cards={cards}
            onImport={importBoard}
            onReset={() => {
              if (window.confirm('Restore the demo board?'))
                commitCards(initialCards, 'Demo board restored.')
            }}
            onClear={() => {
              if (window.confirm('Delete every issue from this local board?'))
                commitCards([], 'Board cleared.')
            }}
            onError={setNotice}
          />
        </section>
        {notice && (
          <output className="notice">
            <span>{notice}</span>
            <button type="button" aria-label="Dismiss message" onClick={() => setNotice('')}>
              <X size={15} />
            </button>
          </output>
        )}

        <QaComposer onCreate={addCard} />
        <div className="workspace">
          <IssueQueue
            cards={visibleCards}
            filter={filter}
            selectedId={selectedCard?.id}
            onFilter={setFilter}
            onSelect={setSelectedId}
          />
          <QaInspector
            card={selectedCard}
            cards={cards}
            statuses={statuses}
            onMove={moveSelected}
            onUpdate={updateSelected}
            onDelete={deleteSelected}
            onError={setNotice}
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
