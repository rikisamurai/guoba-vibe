import { ChevronRight, Link2, TriangleAlert } from 'lucide-react'
import type { ReactNode } from 'react'

import type { SkillRecord } from '../../../shared/types'
import { linkLabel, statusTone, updateLabel } from '../status'

export function SkillRow({
  active,
  onClick,
  skill,
}: {
  active: boolean
  onClick: () => void
  skill: SkillRecord
}) {
  const hue =
    Array.from(skill.name).reduce((total, character) => total + character.charCodeAt(0), 0) % 360
  return (
    <button
      className={`skill-row ${active ? 'active' : ''}`}
      data-testid={`skill-${skill.id}`}
      onClick={onClick}
      type="button"
    >
      <span
        className="skill-avatar"
        style={{
          color: `hsl(${hue} 70% 80%)`,
          background: `hsl(${hue} 25% 18%)`,
          borderColor: `hsl(${hue} 26% 25%)`,
        }}
      >
        {initials(skill.name)}
      </span>
      <span className="skill-copy">
        <span className="skill-title">
          <strong>{skill.name}</strong>
          <small>{skill.scope === 'project' ? 'P' : 'U'}</small>
        </span>
        <span className="skill-description">{skill.description}</span>
        <span className="badge-row">
          <Badge label={updateLabel(skill.updateStatus)} tone={statusTone(skill.updateStatus)} />
          {skill.linkStatus !== 'healthy' ? (
            <Badge
              icon={<Link2 size={10} />}
              label={linkLabel(skill.linkStatus)}
              tone={statusTone(skill.linkStatus)}
            />
          ) : null}
        </span>
      </span>
      {skill.error ? (
        <TriangleAlert className="row-warning" size={16} />
      ) : (
        <ChevronRight className="row-chevron" size={15} />
      )}
    </button>
  )
}

function Badge({ icon, label, tone }: { icon?: ReactNode; label: string; tone: string }) {
  return (
    <span className={`badge ${tone}`}>
      {icon}
      {label}
    </span>
  )
}

function initials(name: string): string {
  return (
    name
      .split(/[\s_-]+/u)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join('') || 'S'
  )
}
