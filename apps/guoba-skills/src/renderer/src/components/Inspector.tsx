import { FileCode2, Link2, RefreshCw, ShieldAlert } from 'lucide-react'
import { useEffect, useState } from 'react'

import type { SkillFileContent, SkillRecord } from '../../../shared/types'
import { linkLabel, statusTone, updateLabel } from '../status'
import type { InspectorTab } from '../ui-types'
import { InspectorContent } from './InspectorContent'

const INSPECTOR_TABS: InspectorTab[] = ['content', 'files', 'source']

interface InspectorProps {
  skill?: SkillRecord
  file?: SkillFileContent
  onCheck: (id: string) => void
  onMakeCanonical: (id: string) => void
  onPrepare: (id: string) => void
  onReadFile: (id: string, path: string) => void
  onSync: (id: string) => void
}

export function Inspector({
  skill,
  file,
  onCheck,
  onMakeCanonical,
  onPrepare,
  onReadFile,
  onSync,
}: InspectorProps) {
  const [tab, setTab] = useState<InspectorTab>('content')
  useEffect(() => setTab('content'), [skill?.id])
  if (!skill)
    return (
      <aside className="inspector empty-inspector">
        <div className="empty-orbit">
          <FileCode2 />
        </div>
        <h2>Select a Skill</h2>
        <p>Inspect its instructions, files, provenance, and Claude link.</p>
      </aside>
    )
  const canUpdate = Boolean(skill.provenance?.sourceUrl) && skill.location === 'canonical'
  return (
    <aside className="inspector" data-testid="inspector">
      <header className="inspector-header">
        <div className="inspector-kicker">
          <span>{skill.scope}</span>
          <span>·</span>
          <span>{skill.location === 'canonical' ? '.agents' : '.claude only'}</span>
        </div>
        <div className="inspector-title-row">
          <div>
            <h2>{skill.name}</h2>
            <p>{skill.description}</p>
          </div>
          <Actions
            canUpdate={canUpdate}
            skill={skill}
            onCheck={onCheck}
            onMakeCanonical={onMakeCanonical}
            onPrepare={onPrepare}
            onSync={onSync}
          />
        </div>
        <div className="health-strip">
          <span className={`health-chip ${statusTone(skill.updateStatus)}`}>
            <RefreshCw size={12} />
            {updateLabel(skill.updateStatus)}
          </span>
          <span className={`health-chip ${statusTone(skill.linkStatus)}`}>
            <Link2 size={12} />
            {linkLabel(skill.linkStatus)}
          </span>
        </div>
        {skill.error ? (
          <div className="inline-warning">
            <ShieldAlert size={15} />
            {skill.error}
          </div>
        ) : null}
        <div className="tabs" role="tablist">
          {INSPECTOR_TABS.map((value) => (
            <button
              aria-selected={tab === value}
              className={tab === value ? 'active' : ''}
              key={value}
              onClick={() => setTab(value)}
              role="tab"
              type="button"
            >
              {value}
            </button>
          ))}
        </div>
      </header>
      <div className="inspector-body">
        <InspectorContent file={file} onReadFile={onReadFile} skill={skill} tab={tab} />
      </div>
    </aside>
  )
}

function Actions({
  canUpdate,
  skill,
  onCheck,
  onMakeCanonical,
  onPrepare,
  onSync,
}: {
  canUpdate: boolean
  skill: SkillRecord
  onCheck: (id: string) => void
  onMakeCanonical: (id: string) => void
  onPrepare: (id: string) => void
  onSync: (id: string) => void
}) {
  if (skill.location === 'claude_only')
    return (
      <button className="primary-button" onClick={() => onMakeCanonical(skill.id)} type="button">
        Make canonical
      </button>
    )
  return (
    <div className="inspector-actions">
      <button
        className="icon-button"
        onClick={() => onCheck(skill.id)}
        title="Check upstream"
        type="button"
      >
        <RefreshCw size={16} />
      </button>
      {skill.linkStatus === 'missing' ? (
        <button className="secondary-button" onClick={() => onSync(skill.id)} type="button">
          <Link2 size={15} />
          Repair
        </button>
      ) : null}
      {canUpdate ? (
        <button className="primary-button" onClick={() => onPrepare(skill.id)} type="button">
          Review update
        </button>
      ) : null}
    </div>
  )
}
