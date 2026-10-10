import type { CSSProperties, ReactNode } from 'react'

interface ContentVisibilityBlockProps {
  children: ReactNode
  estimatedBlockSize?: number
}

export function ContentVisibilityBlock({
  children,
  estimatedBlockSize = 96,
}: ContentVisibilityBlockProps) {
  const style = {
    containIntrinsicBlockSize: `auto ${estimatedBlockSize}px`,
    contentVisibility: 'auto',
  } satisfies CSSProperties
  return (
    <div data-long-output-block="content-visibility" style={style}>
      {children}
    </div>
  )
}
