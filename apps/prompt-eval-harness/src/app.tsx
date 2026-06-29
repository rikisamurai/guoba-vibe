import { BarChart3, CheckCircle2, ClipboardList } from 'lucide-react'
import type { CSSProperties } from 'react'

import { scoreAttempt, type EvalAttempt, type RubricCriterion } from './lib/prompt-eval'

const rubric: RubricCriterion[] = [
  { id: 'correctness', label: 'Correctness', weight: 0.5 },
  { id: 'verification', label: 'Verification', weight: 0.3 },
  { id: 'scope', label: 'Scope control', weight: 0.2 },
]

const attempts: EvalAttempt[] = [
  {
    id: 'agent-a',
    title: 'Agent A',
    ratings: { correctness: 5, verification: 4, scope: 3 },
  },
  {
    id: 'agent-b',
    title: 'Agent B',
    ratings: { correctness: 4, verification: 5, scope: 5 },
  },
  {
    id: 'agent-c',
    title: 'Agent C',
    ratings: { correctness: 3, verification: 3, scope: 4 },
  },
]

export function App() {
  const scores = attempts
    .map((attempt) => scoreAttempt(rubric, attempt))
    .sort((left, right) => right.score - left.score)

  return (
    <main className="page">
      <section className="harness" aria-label="Prompt Eval Harness">
        <header className="topbar">
          <div>
            <p className="eyebrow">business-code eval</p>
            <h1>Prompt Eval Harness</h1>
          </div>
          <div className="leader">
            <CheckCircle2 size={17} aria-hidden="true" />
            {scores[0].title} leads
          </div>
        </header>

        <section className="rubric">
          {rubric.map((criterion) => (
            <article key={criterion.id}>
              <ClipboardList size={18} aria-hidden="true" />
              <span>{criterion.label}</span>
              <strong>{Math.round(criterion.weight * 100)}%</strong>
            </article>
          ))}
        </section>

        <section className="scoreboard">
          <div className="panel-title">
            <BarChart3 size={18} aria-hidden="true" />
            <h2>Attempt scores</h2>
          </div>
          {scores.map((score) => (
            <article key={score.id} className={`score-row ${score.band}`}>
              <div>
                <h3>{score.title}</h3>
                <span>{score.band}</span>
              </div>
              <div className="bar" style={{ '--score': `${score.score}%` } as CSSProperties}>
                <span />
              </div>
              <strong>{score.score}</strong>
            </article>
          ))}
        </section>
      </section>
    </main>
  )
}
