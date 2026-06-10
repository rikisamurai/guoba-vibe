import { Link } from '@tanstack/react-router'
import { ArrowRight, Check, Download, ExternalLink, Plus, Share2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { ActionTooltip } from '@/app/workspace/action-tooltip'
import type { WorkspaceQr } from '@/app/workspace/types'
import { ParsedUrlPanel } from '@/components/parsed-url-panel'
import { QrPreview } from '@/components/qr-preview'
import { Button } from '@/components/shadcn-ui/button'
import { Card, CardAction, CardContent, CardHeader, CardTitle } from '@/components/shadcn-ui/card'
import { parseDeepLink } from '@/lib/url'

type QrInspectorProps = {
  qr?: WorkspaceQr
  search: string
  inspectorDataUrl: string | null
  downloadedInspectorId: string
  copiedShareId: string
  onDataUrl: (next: string | null) => void
  onDownloadPng: (qr: WorkspaceQr) => void
  onCopyShareUrl: (qr: WorkspaceQr) => void
}

export function QrInspector({
  qr,
  search,
  inspectorDataUrl,
  downloadedInspectorId,
  copiedShareId,
  onDataUrl,
  onDownloadPng,
  onCopyShareUrl,
}: QrInspectorProps) {
  const { t } = useTranslation()

  if (!qr) {
    return (
      <Card>
        <CardContent className="space-y-4 py-10 text-center">
          <div className="inline-flex size-14 items-center justify-center rounded-md border">
            <Plus className="text-muted-foreground size-5" />
          </div>
          <div>
            <p className="mb-1 text-sm">{t('workspace.emptyVault')}</p>
            <p className="text-muted-foreground text-xs">
              {search ? t('workspace.noMatchingQr') : t('workspace.createFirstDeeplinkQr')}
            </p>
          </div>
          <Link to="/new" search={{ url: '', title: '', description: '' }}>
            <Button type="button">
              <Plus /> {t('workspace.createQr')}
            </Button>
          </Link>
        </CardContent>
      </Card>
    )
  }

  const parsed = parseDeepLink(qr.url)
  const name = qr.title || parsed.path || t('common.qrFallback')

  return (
    <>
      <Card size="sm" className="shadow-foreground/5 shadow-sm">
        <CardHeader className="bg-muted/20 border-b">
          <div className="min-w-0 space-y-1">
            <p className="text-muted-foreground mb-1 text-[10px] font-medium tracking-wider uppercase">
              {t('common.selectedQr')}
            </p>
            <CardTitle className="truncate text-base">
              {qr.title || t('common.untitledQr')}
            </CardTitle>
            <p className="text-muted-foreground truncate font-mono text-[11px]">
              {parsed.path || qr.url}
            </p>
          </div>
          <CardAction className="flex items-center gap-1">
            <InspectorActions
              qr={qr}
              name={name}
              canDownload={Boolean(inspectorDataUrl)}
              downloadedInspectorId={downloadedInspectorId}
              copiedShareId={copiedShareId}
              onDownloadPng={onDownloadPng}
              onCopyShareUrl={onCopyShareUrl}
            />
          </CardAction>
        </CardHeader>
        <CardContent className="space-y-4 pt-4">
          <div className="bg-background rounded-lg border p-6">
            <QrPreview title={qr.title} url={qr.url} size="inspector" bare onDataUrl={onDataUrl} />
          </div>
          {qr.description && (
            <p className="text-muted-foreground text-sm leading-relaxed">{qr.description}</p>
          )}
          <div className="bg-muted/40 rounded-lg border p-3">
            <p className="text-muted-foreground font-mono text-xs leading-relaxed break-all">
              {qr.url}
            </p>
          </div>
        </CardContent>
      </Card>
      <ParsedUrlPanel url={qr.url} />
    </>
  )
}

function InspectorActions({
  qr,
  name,
  canDownload,
  downloadedInspectorId,
  copiedShareId,
  onDownloadPng,
  onCopyShareUrl,
}: {
  qr: WorkspaceQr
  name: string
  canDownload: boolean
  downloadedInspectorId: string
  copiedShareId: string
  onDownloadPng: (qr: WorkspaceQr) => void
  onCopyShareUrl: (qr: WorkspaceQr) => void
}) {
  const { t } = useTranslation()

  return (
    <>
      <ActionTooltip label={t('common.downloadPng')}>
        <button
          type="button"
          onClick={() => onDownloadPng(qr)}
          disabled={!canDownload}
          aria-label={t('workspace.downloadPngFor', { name })}
          className="text-muted-foreground hover:text-foreground hover:bg-muted/50 disabled:hover:text-muted-foreground flex size-8 shrink-0 items-center justify-center rounded-md border border-transparent transition-colors disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent"
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
          className="text-muted-foreground hover:text-foreground hover:bg-muted/50 flex size-8 shrink-0 items-center justify-center rounded-md border border-transparent transition-colors"
        >
          {copiedShareId === qr.id ? <Check className="size-4" /> : <Share2 className="size-4" />}
        </button>
      </ActionTooltip>
      <ActionTooltip label={t('workspace.openSharePage')}>
        <Link
          to="/share"
          search={{ url: qr.url, title: qr.title ?? '', description: qr.description ?? '' }}
          aria-label={t('workspace.openSharePageFor', { name })}
          className="text-muted-foreground hover:text-foreground hover:bg-muted/50 flex size-8 shrink-0 items-center justify-center rounded-md border border-transparent transition-colors"
        >
          <ExternalLink className="size-4" />
        </Link>
      </ActionTooltip>
      <Link
        to="/q/$qrId"
        params={{ qrId: qr.id }}
        className="text-muted-foreground hover:text-foreground hover:bg-background/80 flex shrink-0 items-center gap-1 rounded-md px-1.5 py-1 text-xs font-medium transition-colors"
      >
        {t('common.edit')} <ArrowRight className="size-3" />
      </Link>
    </>
  )
}
