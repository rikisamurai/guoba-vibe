import { BarChart3, ClipboardList, ListFilter, SlidersHorizontal } from 'lucide-react'
import type { CSSProperties } from 'react'

import type { AttemptScore, EvalSuiteAttempt, RubricCriterion } from './lib/prompt-eval'

export function RubricPanel({
  rubric,
  onWeightChange,
}: {
  rubric: RubricCriterion[]
  onWeightChange: (id: string, weight: number) => void
}) {
  return (
    <section className="rubric-panel" aria-label="Rubric weights">
      <PanelTitle icon={SlidersHorizontal} title="Rubric weights" />
      <div className="criterion-list">
        {rubric.map((criterion) => (
          <CriterionControl
            key={criterion.id}
            criterion={criterion}
            onWeightChange={onWeightChange}
          />
        ))}
      </div>
    </section>
  )
}

export function Scoreboard({
  scores,
  selectedId,
  decisionEnabled,
  onSelect,
}: {
  scores: AttemptScore[]
  selectedId: string
  decisionEnabled: boolean
  onSelect: (id: string) => void
}) {
  return (
    <section className="scoreboard" aria-label="Candidate ranking">
      <PanelTitle icon={BarChart3} title="Candidate ranking" />
      {scores.map((score, index) => (
        <button
          key={score.id}
          type="button"
          className={`score-row ${score.band} ${score.id === selectedId ? 'selected' : ''}`}
          aria-pressed={score.id === selectedId}
          onClick={() => onSelect(score.id)}
        >
          <span className="rank">{index + 1}</span>
          <span className="candidate">
            <strong>{score.title}</strong>
            <small>{decisionEnabled ? score.band : 'suite invalid'}</small>
          </span>
          <span className="bar" style={readScoreStyle(score.score)}>
            <span />
          </span>
          <strong className="score">{score.score}</strong>
        </button>
      ))}
    </section>
  )
}

export function AttemptInspector({
  attempt,
  score,
  rubric,
  decisionEnabled,
}: {
  attempt: EvalSuiteAttempt
  score: AttemptScore
  rubric: RubricCriterion[]
  decisionEnabled: boolean
}) {
  return (
    <aside className={`inspector ${decisionEnabled ? score.band : 'invalid'}`}>
      <PanelTitle icon={ListFilter} title="Evidence inspection" />
      <div className="attempt-title">
        <div>
          <span>{attempt.id}</span>
          <h2>{attempt.title}</h2>
        </div>
        <strong>{score.score}</strong>
      </div>
      <p className="brief">{attempt.brief}</p>
      <blockquote>{attempt.output}</blockquote>
      <div className="matrix">
        {rubric.map((criterion) => (
          <CriterionEvidence key={criterion.id} criterion={criterion} attempt={attempt} />
        ))}
      </div>
    </aside>
  )
}

function CriterionControl({
  criterion,
  onWeightChange,
}: {
  criterion: RubricCriterion
  onWeightChange: (id: string, weight: number) => void
}) {
  return (
    <label className="criterion">
      <span>
        <ClipboardList size={15} aria-hidden="true" />
        {criterion.label}
      </span>
      <input
        aria-label={`${criterion.label} weight`}
        type="range"
        min="0"
        max="1"
        step="0.01"
        value={criterion.weight}
        onChange={(event) => onWeightChange(criterion.id, Number(event.currentTarget.value))}
      />
      <strong>{Math.round(criterion.weight * 100)}%</strong>
    </label>
  )
}

function CriterionEvidence({
  criterion,
  attempt,
}: {
  criterion: RubricCriterion
  attempt: EvalSuiteAttempt
}) {
  return (
    <article className="evidence">
      <div>
        <strong>{criterion.label}</strong>
        <span>
          {attempt.ratings[criterion.id]}/5 · {Math.round(criterion.weight * 100)}%
        </span>
      </div>
      <p>{attempt.evidence[criterion.id]}</p>
    </article>
  )
}

function PanelTitle({ icon: Icon, title }: { icon: typeof BarChart3; title: string }) {
  return (
    <div className="panel-title">
      <Icon size={17} aria-hidden="true" />
      <h2>{title}</h2>
    </div>
  )
}

function readScoreStyle(score: number): CSSProperties & { '--score': string } {
  return { '--score': `${score}%` }
}
