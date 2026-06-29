import { AlertTriangle, CheckCircle2, Image, PanelTop } from 'lucide-react'

import { summarizeBoard, type QaCard, type QaStatus } from './lib/qa-board'

const cards: QaCard[] = [
  { id: 'hero-overlap', title: 'Header action overlaps title', status: 'open', severity: 'high' },
  { id: 'mobile-crop', title: 'Mobile preview crops inspector', status: 'open', severity: 'low' },
  { id: 'button-wrap', title: 'Button text wraps at 375px', status: 'fixed', severity: 'medium' },
  { id: 'dark-pass', title: 'Dark theme contrast accepted', status: 'accepted', severity: 'low' },
]

const columns: QaStatus[] = ['open', 'fixed', 'accepted']

export function App() {
  const summary = summarizeBoard(cards)

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

        <section className="columns">
          {columns.map((status) => (
            <article key={status} className="column">
              <h2>{status}</h2>
              <div className="card-stack">
                {cards
                  .filter((card) => card.status === status)
                  .map((card, index) => (
                    <QaCardView key={card.id} card={card} index={index} />
                  ))}
              </div>
            </article>
          ))}
        </section>
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

function QaCardView({ card, index }: { card: QaCard; index: number }) {
  return (
    <article className={`qa-card ${card.severity}`}>
      <div className="shot" aria-hidden="true">
        <div className="browser-bar">
          <PanelTop size={13} />
        </div>
        <div className={`mock-screen screen-${index}`}>
          <span />
          <span />
          <span />
        </div>
      </div>
      <div className="card-title">
        <Image size={16} aria-hidden="true" />
        <h3>{card.title}</h3>
      </div>
      <footer>
        <span>{card.severity}</span>
        {card.status !== 'open' ? <CheckCircle2 size={16} aria-hidden="true" /> : null}
      </footer>
    </article>
  )
}
