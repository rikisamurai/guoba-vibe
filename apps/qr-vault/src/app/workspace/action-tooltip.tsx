import type { ReactElement } from 'react'

import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/shadcn-ui/tooltip'

export function ActionTooltip({ label, children }: { label: string; children: ReactElement }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  )
}
