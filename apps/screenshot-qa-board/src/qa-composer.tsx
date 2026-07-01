import { PlusCircle } from 'lucide-react'
import { useState } from 'react'

import { createQaCard, type QaSeverity } from './lib/qa-board'
import type { ReviewCard } from './review-data'

export function QaComposer({ onCreate }: { onCreate: (card: ReviewCard) => void }) {
  const [title, setTitle] = useState('New screenshot issue')
  const [severity, setSeverity] = useState<QaSeverity>('medium')
  const [route, setRoute] = useState('/workspace')
  const [viewport, setViewport] = useState('1440 x 900')
  const [note, setNote] = useState('')

  function createCard() {
    onCreate({ ...createQaCard(title, severity, route, viewport), note } as ReviewCard)
  }

  return (
    <section className="qa-composer" aria-label="Create screenshot issue">
      <div className="composer-title">
        <PlusCircle size={17} aria-hidden="true" />
        <strong>Create issue</strong>
      </div>
      <input
        aria-label="Issue title"
        value={title}
        onChange={(event) => setTitle(event.target.value)}
      />
      <div className="composer-row">
        <select
          aria-label="Severity"
          value={severity}
          onChange={(event) => setSeverity(event.target.value as QaSeverity)}
        >
          <option value="high">high</option>
          <option value="medium">medium</option>
          <option value="low">low</option>
        </select>
        <input
          aria-label="Route"
          value={route}
          onChange={(event) => setRoute(event.target.value)}
        />
        <input
          aria-label="Viewport"
          value={viewport}
          onChange={(event) => setViewport(event.target.value)}
        />
      </div>
      <textarea
        aria-label="Review note"
        placeholder="What changed or failed?"
        value={note}
        onChange={(event) => setNote(event.target.value)}
      />
      <button type="button" onClick={createCard}>
        Add screenshot issue
      </button>
    </section>
  )
}
