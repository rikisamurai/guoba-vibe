import type { CSSProperties } from 'react'

type ArmedActionProgressProps = {
  durationMs: number
}

type ArmedActionProgressStyle = CSSProperties & {
  '--armed-action-duration': string
}

export function ArmedActionProgress({ durationMs }: ArmedActionProgressProps) {
  const style: ArmedActionProgressStyle = {
    '--armed-action-duration': `${durationMs}ms`,
  }

  return (
    <span
      aria-hidden="true"
      className="armed-action-progress"
      data-slot="armed-action-progress"
      style={style}
    />
  )
}
