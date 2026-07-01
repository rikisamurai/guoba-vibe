import { BarChart3, CheckCircle2, ClipboardList, ListFilter, SlidersHorizontal } from 'lucide-react'
import { useMemo, useState, type CSSProperties } from 'react'

import { attempts, initialRubric, suite, type HarnessAttempt } from './eval-data'
import {
  normalizeRubricWeights,
  scoreAttempt,
  scoreAttempts,
  updateCriterionWeight,
  validateEvalSuite,
  type AttemptScore,
  type RubricCriterion,
} from './lib/prompt-eval'
import { SuitePanel } from './suite-panel'

const initialLeaderId = scoreAttempts(initialRubric, attempts)[0].id

export function App() {
  const [rubric, setRubric] = useState(initialRubric)
  const [selectedId, setSelectedId] = useState(initialLeaderId)
  const scores = useMemo(() => scoreAttempts(rubric, attempts), [rubric])
  const selectedAttempt = attempts.find((attempt) => attempt.id === selectedId) ?? attempts[0]
  const selectedScore = scoreAttempt(rubric, selectedAttempt)
  const leader = scores[0]
  const validation = validateEvalSuite({ ...suite, rubric, attempts })

  function setWeight(id: string, weight: number) {
    setRubric((current) => updateCriterionWeight(current, id, weight))
  }

  return (
    <main className="page">
      <section className="harness" aria-label="Prompt Eval Harness">
        <header className="topbar">
          <div>
            <p className="eyebrow">eval control room</p>
            <h1>{suite.title}</h1>
            <p className="brief">{suite.description}</p>
          </div>
          <div className="leader">
            <CheckCircle2 size={17} aria-hidden="true" />
            {leader.title} leads
          </div>
        </header>

        <div className="workspace">
          <SuitePanel
            suite={suite}
            errors={validation.errors}
            onNormalize={() => setRubric((current) => normalizeRubricWeights(current))}
          />

          <section className="rubric-panel" aria-label="Rubric weights">
            <div className="panel-title">
              <SlidersHorizontal size={18} aria-hidden="true" />
              <h2>Rubric weights</h2>
            </div>
            {rubric.map((criterion) => (
              <CriterionControl
                key={criterion.id}
                criterion={criterion}
                onWeightChange={setWeight}
              />
            ))}
          </section>

          <section className="scoreboard" aria-label="Attempt scores">
            <div className="panel-title">
              <BarChart3 size={18} aria-hidden="true" />
              <h2>Attempt scores</h2>
            </div>
            {scores.map((score) => (
              <ScoreRow
                key={score.id}
                score={score}
                selected={score.id === selectedAttempt.id}
                onSelect={() => setSelectedId(score.id)}
              />
            ))}
          </section>

          <AttemptInspector attempt={selectedAttempt} score={selectedScore} rubric={rubric} />
        </div>
      </section>
    </main>
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
        <ClipboardList size={17} aria-hidden="true" />
        {criterion.label}
      </span>
      {criterion.description ? <small>{criterion.description}</small> : null}
      <input
        type="range"
        min="0"
        max="1"
        step="0.05"
        value={criterion.weight}
        onChange={(event) => onWeightChange(criterion.id, Number(event.currentTarget.value))}
      />
      <strong>{Math.round(criterion.weight * 100)}%</strong>
    </label>
  )
}

function ScoreRow({
  score,
  selected,
  onSelect,
}: {
  score: AttemptScore
  selected: boolean
  onSelect: () => void
}) {
  return (
    <button
      type="button"
      className={`score-row ${score.band} ${selected ? 'selected' : ''}`}
      onClick={onSelect}
    >
      <div>
        <h3>{score.title}</h3>
        <span>{score.band}</span>
      </div>
      <div className="bar" style={{ '--score': `${score.score}%` } as CSSProperties}>
        <span />
      </div>
      <strong>{score.score}</strong>
    </button>
  )
}

function AttemptInspector({
  attempt,
  score,
  rubric,
}: {
  attempt: HarnessAttempt
  score: AttemptScore
  rubric: RubricCriterion[]
}) {
  return (
    <aside className={`inspector ${score.band}`}>
      <div className="panel-title">
        <ListFilter size={18} aria-hidden="true" />
        <h2>{attempt.title}</h2>
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

function CriterionEvidence({
  criterion,
  attempt,
}: {
  criterion: RubricCriterion
  attempt: HarnessAttempt
}) {
  const rating = attempt.ratings[criterion.id] ?? 0

  return (
    <article className="evidence">
      <div>
        <strong>{criterion.label}</strong>
        <span>
          {rating}/5 · {Math.round(criterion.weight * 100)}%
        </span>
      </div>
      <p>{attempt.evidence[criterion.id]}</p>
    </article>
  )
}
