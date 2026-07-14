import { FlaskConical, ShieldAlert, ShieldCheck } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'

import { defaultSuite } from './eval-data'
import { AttemptInspector, RubricPanel, Scoreboard } from './eval-panels'
import { parseEvalSuite, validateEvalSuite } from './lib/eval-validation'
import {
  normalizeRubricWeights,
  scoreAttempt,
  scoreAttempts,
  updateCriterionWeight,
  type EvalSuite,
} from './lib/prompt-eval'
import { SuitePanel } from './suite-panel'

const storageKey = 'prompt-eval-harness-suite-v1'

export function App() {
  const [initial] = useState(readInitialState)
  const [suite, setSuite] = useState(initial.suite)
  const [selectedId, setSelectedId] = useState(readLeaderId(initial.suite))
  const [suitePayload, setSuitePayload] = useState('')
  const [message, setMessage] = useState(initial.message)
  const scores = useMemo(() => scoreAttempts(suite.rubric, suite.attempts), [suite])
  const selectedAttempt = suite.attempts.find((attempt) => attempt.id === selectedId)
  const attempt = selectedAttempt ?? suite.attempts[0]
  const selectedScore = scoreAttempt(suite.rubric, attempt)
  const leader = scores[0]
  const validation = useMemo(() => validateEvalSuite(suite), [suite])

  useEffect(() => {
    if (!validation.ok) return

    try {
      window.localStorage.setItem(storageKey, JSON.stringify(suite))
    } catch {
      setMessage('Local save failed. Export the suite before leaving this page.')
    }
  }, [suite, validation.ok])

  function setWeight(id: string, weight: number) {
    setSuite((current) => ({
      ...current,
      rubric: updateCriterionWeight(current.rubric, id, weight),
    }))
  }

  function normalizeWeights() {
    setSuite((current) => ({ ...current, rubric: normalizeRubricWeights(current.rubric) }))
    setMessage('Weights normalized to exactly 100%.')
  }

  function importSuite() {
    const parsed = parseEvalSuite(suitePayload)
    if (!parsed.ok) {
      setMessage(`Import rejected: ${parsed.errors.join(' ')}`)
      return
    }

    setSuite(parsed.suite)
    setSelectedId(readLeaderId(parsed.suite))
    setMessage(`Imported “${parsed.suite.title}” with ${parsed.suite.attempts.length} attempts.`)
  }

  function resetSuite() {
    setSuite(defaultSuite)
    setSelectedId(readLeaderId(defaultSuite))
    setMessage('Restored the bundled regression suite.')
  }

  return (
    <main className="page">
      <section className="harness" aria-label="Prompt Eval Harness">
        <header className="topbar">
          <div className="brand">
            <FlaskConical size={20} aria-hidden="true" />
            <div>
              <p>PROMPT EVAL HARNESS</p>
              <span>Auditable manual evidence ranking</span>
            </div>
          </div>
          <div className="decision">
            <span className={validation.ok ? 'valid' : 'invalid'}>
              {validation.ok ? <ShieldCheck size={15} /> : <ShieldAlert size={15} />}
              {validation.ok ? 'SUITE VALID' : 'DECISION BLOCKED'}
            </span>
            <strong>
              {validation.ok ? `${leader.title} · ${leader.score}` : 'Normalize or repair'}
            </strong>
          </div>
        </header>

        <div className="suite-heading">
          <div>
            <p>ACTIVE SUITE · {suite.id}</p>
            <h1>{suite.title}</h1>
          </div>
          <span>Manual ratings only · candidate code is not executed</span>
        </div>

        <div className="workspace">
          <SuitePanel
            suite={suite}
            errors={validation.errors}
            payload={suitePayload}
            message={message}
            onPayloadChange={setSuitePayload}
            onNormalize={normalizeWeights}
            onExport={() => {
              setSuitePayload(JSON.stringify(suite, null, 2))
              setMessage('Suite exported into the transfer field.')
            }}
            onImport={importSuite}
            onReset={resetSuite}
          />

          <div className="ranking-column">
            <Scoreboard
              scores={scores}
              selectedId={attempt.id}
              decisionEnabled={validation.ok}
              onSelect={setSelectedId}
            />
            <RubricPanel rubric={suite.rubric} onWeightChange={setWeight} />
          </div>

          <AttemptInspector
            attempt={attempt}
            score={selectedScore}
            rubric={suite.rubric}
            decisionEnabled={validation.ok}
          />
        </div>
      </section>
    </main>
  )
}

function readInitialState(): { suite: EvalSuite; message: string } {
  if (typeof window === 'undefined') return { suite: defaultSuite, message: '' }

  try {
    const stored = window.localStorage.getItem(storageKey)
    if (!stored) return { suite: defaultSuite, message: '' }

    const parsed = parseEvalSuite(stored)
    return parsed.ok
      ? { suite: parsed.suite, message: 'Restored the last valid local suite.' }
      : { suite: defaultSuite, message: 'Stored suite was invalid; restored the bundled suite.' }
  } catch {
    return { suite: defaultSuite, message: 'Local storage is unavailable; use suite export.' }
  }
}

function readLeaderId(suite: EvalSuite) {
  return scoreAttempts(suite.rubric, suite.attempts)[0]?.id ?? suite.attempts[0]?.id ?? ''
}
