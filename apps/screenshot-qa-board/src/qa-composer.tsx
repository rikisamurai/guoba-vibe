import { PlusCircle } from 'lucide-react'
import { useState } from 'react'

import { ImageInput } from './image-input'
import { createQaCard, type QaSeverity } from './lib/qa-board'
import type { ReviewCard } from './review-data'

export function QaComposer({ onCreate }: { onCreate: (card: ReviewCard) => boolean }) {
  const environment = detectEnvironment()
  const [title, setTitle] = useState('')
  const [severity, setSeverity] = useState<QaSeverity>('medium')
  const [route, setRoute] = useState('/workspace')
  const [viewport, setViewport] = useState('1440 x 900')
  const [browser, setBrowser] = useState(environment.browser)
  const [os, setOs] = useState(environment.os)
  const [capturedAt, setCapturedAt] = useState(toLocalDateTime(new Date()))
  const [note, setNote] = useState('')
  const [beforeImage, setBeforeImage] = useState('')
  const [afterImage, setAfterImage] = useState('')
  const [error, setError] = useState('')

  function createCard(event: React.FormEvent) {
    event.preventDefault()
    try {
      const card = createQaCard({
        title: title.trim(),
        severity,
        route: route.trim(),
        viewport: viewport.trim(),
        browser: browser.trim(),
        os: os.trim(),
        capturedAt: new Date(capturedAt).toISOString(),
        note: note.trim(),
        beforeImage,
        afterImage,
      })
      if (!onCreate(card)) return
      setTitle('')
      setNote('')
      setBeforeImage('')
      setAfterImage('')
      setError('')
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Issue could not be created.')
    }
  }

  return (
    <details className="qa-composer">
      <summary>
        <PlusCircle size={18} aria-hidden="true" />
        <span>
          <strong>New visual issue</strong>
          <small>Attach evidence and capture metadata</small>
        </span>
      </summary>
      <form onSubmit={createCard}>
        <label className="wide-field">
          <span className="field-label">Issue title</span>
          <input
            aria-label="Issue title"
            required
            value={title}
            placeholder="What is visually wrong?"
            onChange={(event) => setTitle(event.target.value)}
          />
        </label>
        <div className="composer-grid three-up">
          <Field label="Route" value={route} onChange={setRoute} required />
          <Field label="Viewport" value={viewport} onChange={setViewport} required />
          <label>
            <span className="field-label">Severity</span>
            <select
              aria-label="Severity"
              value={severity}
              onChange={(event) => setSeverity(readSeverity(event.target.value))}
            >
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </label>
        </div>
        <div className="composer-grid three-up">
          <Field label="Browser" value={browser} onChange={setBrowser} required />
          <Field label="OS" value={os} onChange={setOs} required />
          <label>
            <span className="field-label">Captured at</span>
            <input
              aria-label="Captured at"
              type="datetime-local"
              required
              value={capturedAt}
              onChange={(event) => setCapturedAt(event.target.value)}
            />
          </label>
        </div>
        <label className="wide-field">
          <span className="field-label">Review note</span>
          <textarea
            aria-label="Review note"
            value={note}
            placeholder="Expected result, observed defect, or retest note"
            onChange={(event) => setNote(event.target.value)}
          />
        </label>
        <div className="composer-grid image-fields">
          <ImageInput
            label="Before"
            source={beforeImage}
            onCommit={setBeforeImage}
            onError={setError}
          />
          <ImageInput
            label="After"
            source={afterImage}
            onCommit={setAfterImage}
            onError={setError}
          />
        </div>
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        <button className="primary-button" type="submit">
          Add to review queue
        </button>
      </form>
    </details>
  )
}

function Field({
  label,
  value,
  onChange,
  required = false,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  required?: boolean
}) {
  return (
    <label>
      <span className="field-label">{label}</span>
      <input
        aria-label={label}
        required={required}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  )
}

function readSeverity(value: string): QaSeverity {
  return value === 'high' || value === 'low' ? value : 'medium'
}

function detectEnvironment() {
  if (typeof navigator === 'undefined') return { browser: 'Unknown browser', os: 'Unknown OS' }
  const agent = navigator.userAgent
  const browser = agent.includes('Edg/')
    ? 'Edge'
    : agent.includes('Firefox/')
      ? 'Firefox'
      : agent.includes('Chrome/')
        ? 'Chrome'
        : agent.includes('Safari/')
          ? 'Safari'
          : 'Other browser'
  const os = agent.includes('Mac OS')
    ? 'macOS'
    : agent.includes('Windows')
      ? 'Windows'
      : agent.includes('Android')
        ? 'Android'
        : /iPhone|iPad/.test(agent)
          ? 'iOS'
          : agent.includes('Linux')
            ? 'Linux'
            : 'Other OS'
  return { browser, os }
}

function toLocalDateTime(date: Date) {
  const offset = date.getTimezoneOffset() * 60_000
  return new Date(date.getTime() - offset).toISOString().slice(0, 16)
}
