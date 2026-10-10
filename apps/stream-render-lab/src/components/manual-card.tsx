import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'

interface ManualCardProps {
  index: string
  title: string
  description: string
  meta: string
  to?: string
  children?: ReactNode
}

export function ManualCard({ index, title, description, meta, to, children }: ManualCardProps) {
  const content = (
    <>
      <div className="manual-card__index">{index}</div>
      <div className="manual-card__body">
        <p className="manual-card__meta">{meta}</p>
        <h2>{title}</h2>
        <p>{description}</p>
        {children}
      </div>
      {to === undefined ? null : (
        <span className="manual-card__arrow" aria-hidden="true">
          ↗
        </span>
      )}
    </>
  )

  return to === undefined ? (
    <article className="manual-card">{content}</article>
  ) : (
    <Link className="manual-card manual-card--link" to={to}>
      {content}
    </Link>
  )
}
