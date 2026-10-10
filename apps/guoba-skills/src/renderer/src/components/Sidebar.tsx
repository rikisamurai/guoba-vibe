import { AlertTriangle, Boxes, ChevronDown, FolderGit2, RefreshCw, Sparkles } from 'lucide-react'
import type { ReactNode } from 'react'

import type { Inventory } from '../../../shared/types'
import { isElectron } from '../transport'
import type { SkillFilter } from '../ui-types'

interface SidebarProps {
  filter: SkillFilter
  inventory?: Inventory
  onChooseProject: () => void
  onFilter: (filter: SkillFilter) => void
}

export function Sidebar({ filter, inventory, onChooseProject, onFilter }: SidebarProps) {
  const skills = inventory?.skills ?? []
  const updates = skills.filter((skill) => skill.updateStatus === 'update_available').length
  const attention = skills.filter(
    (skill) =>
      skill.linkStatus !== 'healthy' ||
      ['local_modified', 'diverged', 'error'].includes(skill.updateStatus),
  ).length
  const project = inventory?.projectRoot?.split('/').at(-1) ?? 'No project open'
  return (
    <aside className="sidebar">
      <div className="traffic-space" />
      <div className="brand">
        <div className="brand-mark">
          <Sparkles size={16} />
        </div>
        <span>Guoba Skills</span>
      </div>
      <nav className="nav-stack" aria-label="Skill filters">
        <Filter
          active={filter === 'all'}
          count={skills.length}
          icon={<Boxes />}
          label="All Skills"
          onClick={() => onFilter('all')}
        />
        <Filter
          active={filter === 'updates'}
          count={updates}
          icon={<RefreshCw />}
          label="Updates"
          onClick={() => onFilter('updates')}
        />
        <Filter
          active={filter === 'attention'}
          count={attention}
          icon={<AlertTriangle />}
          label="Needs attention"
          onClick={() => onFilter('attention')}
        />
      </nav>
      <div className="sidebar-label">Workspace</div>
      <button
        className="workspace-card"
        disabled={!isElectron}
        onClick={onChooseProject}
        type="button"
      >
        <span className="workspace-icon">
          <FolderGit2 size={17} />
        </span>
        <span>
          <strong>{project}</strong>
          <small>{inventory?.projectRoot ?? 'Open a repository'}</small>
        </span>
        {isElectron ? <ChevronDown size={14} /> : null}
      </button>
      <div className="scope-summary">
        <Scope label="Project" value={skills.filter((skill) => skill.scope === 'project').length} />
        <Scope label="User" value={skills.filter((skill) => skill.scope === 'user').length} />
      </div>
      <div className="sidebar-spacer" />
      <div className="canonical-note">
        <span className="status-dot" />
        <div>
          <strong>.agents is canonical</strong>
          <small>.claude stays linked and visible</small>
        </div>
      </div>
    </aside>
  )
}

function Filter({
  active,
  count,
  icon,
  label,
  onClick,
}: {
  active: boolean
  count: number
  icon: ReactNode
  label: string
  onClick: () => void
}) {
  return (
    <button className={`nav-item ${active ? 'active' : ''}`} onClick={onClick} type="button">
      {icon}
      <span>{label}</span>
      <em>{count}</em>
    </button>
  )
}

function Scope({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  )
}
