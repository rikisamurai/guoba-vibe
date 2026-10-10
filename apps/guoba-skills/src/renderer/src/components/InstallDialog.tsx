import { Download, X } from 'lucide-react'
import { useState, type FormEvent } from 'react'

import type { InstallRequest, SkillScope } from '../../../shared/types'

interface InstallDialogProps {
  onClose: () => void
  onInstall: (request: InstallRequest) => Promise<void>
}

export function InstallDialog({ onClose, onInstall }: InstallDialogProps) {
  const [source, setSource] = useState('')
  const [scope, setScope] = useState<SkillScope>('project')
  const [skill, setSkill] = useState('')
  const [ref, setRef] = useState('')
  const [pending, setPending] = useState(false)

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setPending(true)
    try {
      await onInstall({ source, scope, skill: skill || undefined, ref: ref || undefined })
    } finally {
      setPending(false)
    }
  }

  return (
    <div aria-modal="true" className="dialog-backdrop" role="dialog">
      <form className="install-dialog" onSubmit={(event) => void submit(event)}>
        <header className="dialog-header">
          <div className="dialog-icon">
            <Download size={19} />
          </div>
          <div>
            <h2>Add a Skill</h2>
            <p>skills.sh for discovery, Git for verified content</p>
          </div>
          <button
            aria-label="Close install dialog"
            className="icon-button"
            onClick={onClose}
            type="button"
          >
            <X size={17} />
          </button>
        </header>
        <div className="install-fields">
          <label>
            <span>Source</span>
            <input
              autoFocus
              onChange={(event) => setSource(event.target.value)}
              placeholder="https://skills.sh/owner/repo/skill"
              required
              value={source}
            />
            <small>Also accepts owner/repo or an authenticated Git URL.</small>
          </label>
          <div className="form-row">
            <label>
              <span>Install scope</span>
              <select onChange={(event) => setScope(parseScope(event.target.value))} value={scope}>
                <option value="project">Project</option>
                <option value="user">User</option>
              </select>
            </label>
            <label>
              <span>
                Skill slug <em>optional</em>
              </span>
              <input
                onChange={(event) => setSkill(event.target.value)}
                placeholder="auto-detect"
                value={skill}
              />
            </label>
          </div>
          <label>
            <span>
              Branch or tag <em>optional</em>
            </span>
            <input
              onChange={(event) => setRef(event.target.value)}
              placeholder="capture repository default"
              value={ref}
            />
          </label>
          <div className="install-model">
            <span className="agents-node">.agents/skills</span>
            <i>canonical content</i>
            <span className="link-arrow">→</span>
            <span className="claude-node">.claude/skills</span>
            <i>safe symlink</i>
          </div>
        </div>
        <footer className="dialog-footer">
          <span>Existing directories are never overwritten.</span>
          <div>
            <button className="secondary-button" onClick={onClose} type="button">
              Cancel
            </button>
            <button className="primary-button" disabled={pending} type="submit">
              {pending ? 'Installing…' : 'Install Skill'}
            </button>
          </div>
        </footer>
      </form>
    </div>
  )
}

function parseScope(value: string): SkillScope {
  return value === 'user' ? 'user' : 'project'
}
