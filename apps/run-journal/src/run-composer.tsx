import { Plus } from 'lucide-react'
import { type FormEvent, type ReactNode, useState } from 'react'

import {
  createRunFromLog,
  isSafeArtifactHref,
  type RecordedOutcome,
  type RunRecord,
} from './lib/run-journal'

const blankForm = {
  title: '',
  commandLog: '',
  evidence: '',
  cwd: '',
  commit: '',
  durationSeconds: '',
  artifactLabel: '',
  artifactHref: '',
}

export function RunComposer({ onCreate }: { onCreate: (run: RunRecord) => void }) {
  const [form, setForm] = useState(blankForm)
  const [outcome, setOutcome] = useState<RecordedOutcome>('draft')
  const [exitCode, setExitCode] = useState('1')
  const [error, setError] = useState('')

  function update(key: keyof typeof blankForm, value: string) {
    setForm((current) => ({ ...current, [key]: value }))
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const validationError = validateForm(form.title, form.commandLog, form.artifactHref)
    if (validationError) {
      setError(validationError)
      return
    }

    const duration = Number(form.durationSeconds)
    const run = createRunFromLog({
      title: form.title,
      commandLog: form.commandLog,
      outcome,
      exitCode: Number(exitCode),
      evidence: form.evidence,
      cwd: form.cwd,
      commit: form.commit,
      durationMs:
        form.durationSeconds && Number.isFinite(duration) && duration >= 0
          ? duration * 1_000
          : undefined,
      artifactLabel: form.artifactLabel,
      artifactHref: form.artifactHref,
    })

    onCreate(run)
    setForm(blankForm)
    setOutcome('draft')
    setExitCode('1')
    setError('')
  }

  return (
    <details className="composer">
      <summary>
        <Plus size={16} aria-hidden="true" />
        New run
      </summary>
      <form onSubmit={submit}>
        <Field label="Run title">
          <input
            value={form.title}
            onChange={(event) => update('title', event.target.value)}
            placeholder="Checkout release verification"
          />
        </Field>

        <Field
          label="Commands"
          hint="One per line. Prefix with [0], [1], or [?] for mixed results; plain text uses the default below."
        >
          <textarea
            value={form.commandLog}
            onChange={(event) => update('commandLog', event.target.value)}
            placeholder={'[0] pnpm --filter checkout test\n[1] pnpm --filter checkout build'}
          />
        </Field>

        <div className="form-grid">
          <Field label="Default result" hint="Applied only to lines without an explicit prefix.">
            <select
              value={outcome}
              onChange={(event) => setOutcome(parseOutcome(event.target.value))}
            >
              <option value="draft">Draft · unknown</option>
              <option value="passed">Passed · exit 0</option>
              <option value="failed">Failed · nonzero</option>
            </select>
          </Field>
          {outcome === 'failed' ? (
            <Field label="Exit code">
              <input
                type="number"
                min="1"
                step="1"
                value={exitCode}
                onChange={(event) => setExitCode(event.target.value)}
              />
            </Field>
          ) : null}
        </div>

        <Field label="Command evidence" hint="Paste the decisive output, error, or test summary.">
          <textarea
            value={form.evidence}
            onChange={(event) => update('evidence', event.target.value)}
            placeholder="12 tests passed in 1.4s"
          />
        </Field>

        <div className="form-grid metadata-fields">
          <Field label="Working directory">
            <input
              value={form.cwd}
              onChange={(event) => update('cwd', event.target.value)}
              placeholder="apps/checkout"
            />
          </Field>
          <Field label="Commit">
            <input
              value={form.commit}
              onChange={(event) => update('commit', event.target.value)}
              placeholder="a1b2c3d"
            />
          </Field>
          <Field label="Duration (seconds)">
            <input
              type="number"
              min="0"
              step="0.1"
              value={form.durationSeconds}
              onChange={(event) => update('durationSeconds', event.target.value)}
              placeholder="18.4"
            />
          </Field>
        </div>

        <div className="form-grid artifact-fields">
          <Field label="Artifact label">
            <input
              value={form.artifactLabel}
              onChange={(event) => update('artifactLabel', event.target.value)}
              placeholder="CI log"
            />
          </Field>
          <Field label="Artifact URL / relative path">
            <input
              value={form.artifactHref}
              onChange={(event) => update('artifactHref', event.target.value)}
              placeholder="https://github.com/…"
            />
          </Field>
        </div>

        {error ? (
          <p className="form-error" role="alert">
            {error}
          </p>
        ) : null}
        <button className="primary-button" type="submit">
          Record run
        </button>
      </form>
    </details>
  )
}

function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label>
      <span>{label}</span>
      {children}
      {hint ? <small>{hint}</small> : null}
    </label>
  )
}

function validateForm(title: string, commandLog: string, artifactHref: string) {
  if (!title.trim()) return 'Add a title so this run remains identifiable in history.'
  if (!commandLog.trim()) return 'Record at least one command. Unknown results can stay draft.'
  if (artifactHref.trim() && !isSafeArtifactHref(artifactHref.trim())) {
    return 'Artifact links must use http(s), an anchor, or a relative path.'
  }
  return ''
}

function parseOutcome(value: string): RecordedOutcome {
  if (value === 'passed' || value === 'failed') return value
  return 'draft'
}
