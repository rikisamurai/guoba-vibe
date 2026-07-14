import { Link } from '@tanstack/react-router'
import { Check, Copy, SquarePen, Trash2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { ActionTooltip } from '@/app/workspace/action-tooltip'
import type { ActiveFilter, WorkspaceQr } from '@/app/workspace/types'
import { workspaceFilterSearch } from '@/app/workspace/workspace-filter'

type QrRowActionsProps = {
  qr: WorkspaceQr
  name: string
  copiedUrlId: string
  activeFilter: ActiveFilter
  onCopyUrl: (qr: WorkspaceQr) => void
  onArmDelete: (id: string) => void
}

export function QrRowActions({
  qr,
  name,
  copiedUrlId,
  activeFilter,
  onCopyUrl,
  onArmDelete,
}: QrRowActionsProps) {
  const { t } = useTranslation()

  return (
    <>
      <ActionTooltip label={t('common.copyUrl')}>
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation()
            onCopyUrl(qr)
          }}
          aria-label={t('workspace.copyUrlFor', { name })}
          className="text-muted-foreground hover:text-foreground hover:border-ring/60 bg-background/80 focus-visible:ring-ring/30 flex size-10 items-center justify-center rounded-md border border-transparent shadow-sm transition-all focus-visible:ring-2 active:translate-y-px sm:size-8"
        >
          {copiedUrlId === qr.id ? <Check className="size-4" /> : <Copy className="size-4" />}
        </button>
      </ActionTooltip>
      <ActionTooltip label={t('common.edit')}>
        <Link
          to="/q/$qrId"
          params={{ qrId: qr.id }}
          search={workspaceFilterSearch(activeFilter)}
          aria-label={t('workspace.editQr', { name })}
          className="text-muted-foreground hover:text-foreground hover:border-ring/60 bg-background/80 focus-visible:ring-ring/30 flex size-10 items-center justify-center rounded-md border border-transparent shadow-sm transition-all focus-visible:ring-2 active:translate-y-px sm:size-8"
        >
          <SquarePen className="size-4" />
        </Link>
      </ActionTooltip>
      <ActionTooltip label={t('common.delete')}>
        <button
          type="button"
          data-armed-for={qr.id}
          onClick={(event) => {
            event.stopPropagation()
            onArmDelete(qr.id)
          }}
          aria-label={t('workspace.deleteQr', { name })}
          className="text-muted-foreground hover:text-destructive hover:border-destructive/40 bg-background/80 focus-visible:ring-destructive/20 flex size-10 items-center justify-center rounded-md border border-transparent shadow-sm transition-all focus-visible:ring-2 active:translate-y-px sm:size-8"
        >
          <Trash2 className="size-4" />
        </button>
      </ActionTooltip>
    </>
  )
}
