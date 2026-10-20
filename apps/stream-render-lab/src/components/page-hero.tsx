import type { ReactNode } from 'react'

interface PageHeroProps {
  eyebrow: string
  title: string
  lead: string
  aside?: ReactNode
  actions?: ReactNode
  compact?: boolean
}

export function PageHero({ eyebrow, title, lead, aside, actions, compact = false }: PageHeroProps) {
  return (
    <section className={compact ? 'page-hero page-hero--compact' : 'page-hero'}>
      <div className="page-hero__copy">
        <p className="eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        <p className="page-hero__lead">{lead}</p>
        {actions === undefined ? null : <div className="page-hero__actions">{actions}</div>}
      </div>
      {aside === undefined ? null : <div className="page-hero__aside">{aside}</div>}
    </section>
  )
}
