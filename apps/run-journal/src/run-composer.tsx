import { PlusCircle } from 'lucide-react'
import { useState } from 'react'

import { createRunFromLog, type RunRecord } from './lib/run-journal'

export function RunComposer({ onCreate }: { onCreate: (run: RunRecord) => void }) {
  const [title, setTitle] = useState('New PR verification')
  const [log, setLog] = useState('pnpm --filter app test\npnpm --filter app build')
  const [artifact, setArtifact] = useState('')

  function createRun() {
    const run = createRunFromLog(title, log)

    if (artifact.trim()) {
      run.events.push({ kind: 'artifact', label: 'artifact', href: artifact.trim() })
    }

    onCreate(run)
  }

  return (
    <section className="composer" aria-label="Create run">
      <div className="panel-title">
        <PlusCircle size={18} aria-hidden="true" />
        <h2>Add run evidence</h2>
      </div>
      <label>
        <span>Run title</span>
        <input value={title} onChange={(event) => setTitle(event.target.value)} />
      </label>
      <label>
        <span>Command log</span>
        <textarea value={log} onChange={(event) => setLog(event.target.value)} />
      </label>
      <label>
        <span>Artifact URL or path</span>
        <input value={artifact} onChange={(event) => setArtifact(event.target.value)} />
      </label>
      <button type="button" onClick={createRun}>
        Add run
      </button>
    </section>
  )
}
