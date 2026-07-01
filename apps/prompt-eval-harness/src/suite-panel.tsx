import { ClipboardList, TerminalSquare } from 'lucide-react'

import type { EvalSuite } from './lib/prompt-eval'

export function SuitePanel({
  suite,
  errors,
  onNormalize,
}: {
  suite: EvalSuite
  errors: string[]
  onNormalize: () => void
}) {
  return (
    <section className="suite-panel" aria-label="Eval suite">
      <div className="panel-title">
        <ClipboardList size={18} aria-hidden="true" />
        <h2>Suite contract</h2>
      </div>
      <p className="prompt">{suite.task.prompt}</p>
      <ul>
        {suite.task.expectedOutcome.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
      <div className={`suite-status ${errors.length ? 'invalid' : 'valid'}`}>
        {errors.length ? `${errors.length} suite issues` : 'Suite is complete'}
      </div>
      {errors.length
        ? errors.map((error) => (
            <p key={error} className="suite-error">
              {error}
            </p>
          ))
        : null}
      <button type="button" onClick={onNormalize}>
        Normalize weights
      </button>
      <code className="cli-command">
        <TerminalSquare size={15} aria-hidden="true" />
        pnpm --filter prompt-eval-harness eval
      </code>
    </section>
  )
}
