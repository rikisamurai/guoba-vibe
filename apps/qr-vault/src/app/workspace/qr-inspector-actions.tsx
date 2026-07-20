import { Link } from '@tanstack/react-router'
import { ArrowRight, Check, Download, ExternalLink, Share2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { ActionTooltip } from '@/app/workspace/action-tooltip'
import type { ActiveFilter, WorkspaceQr } from '@/app/workspace/types'
import { workspaceFilterSearch } from '@/app/workspace/workspace-filter'

type QrInspectorActionsProps = {
  qr: WorkspaceQr
  name: string
  canDownload: boolean
  downloadedInspectorId: string
  copiedShareId: string
  activeFilter: ActiveFilter
  onDownloadPng: (qr: WorkspaceQr) => void
  onCopyShareUrl: (qr: WorkspaceQr) => void
}

export function QrInspectorActions({
  qr,
  name,
  canDownload,
  downloadedInspectorId,
  copiedShareId,
  activeFilter,
  onDownloadPng,
  onCopyShareUrl,
}: QrInspectorActionsProps) {
  const { t } = useTranslation()

  return (
    <>
      <ActionTooltip label={t('common.downloadPng')}>
        <button
          type="button"
          onClick={() => onDownloadPng(qr)}
          disabled={!canDownload}
          aria-label={t('workspace.downloadPngFor', { name })}
          className="interactive-press text-muted-foreground hover:text-foreground hover:border-ring/60 hover:bg-muted/50 disabled:hover:text-muted-foreground focus-visible:ring-ring/30 flex size-8 shrink-0 items-center justify-center rounded-md border border-transparent focus-visible:ring-2 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent"
        >
          {downloadedInspectorId === qr.id ? (
            <Check className="size-4" />
          ) : (
            <Download className="size-4" />
          )}
        </button>
      </ActionTooltip>
      <ActionTooltip label={t('common.copyShareLink')}>
        <button
          type="button"
          onClick={() => onCopyShareUrl(qr)}
          aria-label={t('workspace.copyShareLinkFor', { name })}
          className="interactive-press text-muted-foreground hover:text-foreground hover:border-ring/60 hover:bg-muted/50 focus-visible:ring-ring/30 flex size-8 shrink-0 items-center justify-center rounded-md border border-transparent focus-visible:ring-2"
        >
          {copiedShareId === qr.id ? <Check className="size-4" /> : <Share2 className="size-4" />}
        </button>
      </ActionTooltip>
      <ActionTooltip label={t('workspace.openSharePage')}>
        <Link
          to="/share"
          search={{ url: qr.url, title: qr.title ?? '', description: qr.description ?? '' }}
          aria-label={t('workspace.openSharePageFor', { name })}
          className="interactive-press text-muted-foreground hover:text-foreground hover:border-ring/60 hover:bg-muted/50 focus-visible:ring-ring/30 flex size-8 shrink-0 items-center justify-center rounded-md border border-transparent focus-visible:ring-2"
        >
          <ExternalLink className="size-4" />
        </Link>
      </ActionTooltip>
      <Link
        to="/q/$qrId"
        params={{ qrId: qr.id }}
        search={workspaceFilterSearch(activeFilter)}
        className="interactive-press text-muted-foreground hover:text-foreground hover:border-ring/60 hover:bg-background/80 focus-visible:ring-ring/30 flex h-8 shrink-0 items-center gap-1 rounded-md border border-transparent px-2 text-xs font-medium focus-visible:ring-2"
      >
        {t('common.edit')} <ArrowRight className="size-3" />
      </Link>
    </>
  )
}
