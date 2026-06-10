import type { ReactNode } from 'react'

import { Label } from '@/components/shadcn-ui/label'

export function FieldLabel({ htmlFor, children }: { htmlFor?: string; children: ReactNode }) {
  return (
    <Label
      htmlFor={htmlFor}
      className="text-muted-foreground text-xs font-medium tracking-wide uppercase"
    >
      {children}
    </Label>
  )
}
