import { CheckCheck, Plus, Search } from 'lucide-react'

import type { SkillRecord } from '../../../shared/types'
import { SkillRow } from './SkillRow'

interface SkillListProps {
  busy: boolean
  onAdd: () => void
  onCheck: () => void
  onQuery: (query: string) => void
  onSelect: (id: string) => void
  query: string
  selectedId?: string
  skills: SkillRecord[]
}

export function SkillList(props: SkillListProps) {
  return (
    <section className="skills-column">
      <header className="list-header">
        <div>
          <h1>Skills</h1>
          <p>Project and User inventory</p>
        </div>
        <div className="header-actions">
          <button
            aria-label="Check all updates"
            className="icon-button"
            disabled={props.busy}
            onClick={props.onCheck}
            type="button"
          >
            <CheckCheck size={17} />
          </button>
          <button className="primary-button" onClick={props.onAdd} type="button">
            <Plus size={16} />
            Add Skill
          </button>
        </div>
      </header>
      <label className="search-box">
        <Search size={16} />
        <input
          aria-label="Search Skills"
          onChange={(event) => props.onQuery(event.target.value)}
          placeholder="Search Skills"
          value={props.query}
        />
        <kbd>⌘ K</kbd>
      </label>
      <div className="list-label">
        <span>{props.skills.length} visible</span>
        <span>Scope</span>
      </div>
      <div className="skill-list" data-testid="skill-list">
        {props.skills.map((skill) => (
          <SkillRow
            active={skill.id === props.selectedId}
            key={skill.id}
            onClick={() => props.onSelect(skill.id)}
            skill={skill}
          />
        ))}
        {props.skills.length === 0 ? (
          <div className="empty-list">
            <strong>No matching Skills</strong>
            <span>Try another filter or install one from skills.sh.</span>
          </div>
        ) : null}
      </div>
    </section>
  )
}
