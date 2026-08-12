import type { MDXComponents } from 'mdx/types'
import type { ReactNode } from 'react'

interface CheckpointProps {
  children: ReactNode
  label: string
  tone?: 'alert' | 'proof' | 'note'
}

function Checkpoint({ children, label, tone = 'note' }: CheckpointProps) {
  return (
    <aside className={`lesson-checkpoint lesson-checkpoint--${tone}`}>
      <span>{label}</span>
      <div>{children}</div>
    </aside>
  )
}

export const lessonComponents: MDXComponents = {
  Checkpoint,
}
