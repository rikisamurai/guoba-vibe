import { Link } from '@tanstack/react-router'
import { Plus } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { QrInspectorActions } from '@/app/workspace/qr-inspector-actions'
import type { ActiveFilter, WorkspaceQr } from '@/app/workspace/types'
import { workspaceFilterSearch } from '@/app/workspace/workspace-filter'
import { ParsedUrlPanel } from '@/components/parsed-url-panel'
import { QrPreview } from '@/components/qr-preview'
import { Button } from '@/components/shadcn-ui/button'
import { Card, CardAction, CardContent, CardHeader, CardTitle } from '@/components/shadcn-ui/card'
import { parseDeepLink } from '@/lib/url'

type QrInspectorProps = {
  qr?: WorkspaceQr
  search: string
  activeFilter: ActiveFilter
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
  activeFilter,
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
          <div className="scan-plate inline-flex size-14 items-center justify-center rounded-lg border">
            <Plus className="text-muted-foreground size-5" />
          </div>
          <div>
            <p className="mb-1 text-sm">{t('workspace.emptyVault')}</p>
            <p className="text-muted-foreground text-xs">
              {search ? t('workspace.noMatchingQr') : t('workspace.createFirstDeeplinkQr')}
            </p>
          </div>
          <Link
            to="/new"
            search={{ url: '', title: '', description: '', ...workspaceFilterSearch(activeFilter) }}
          >
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
        <CardHeader className="bg-muted/25 border-b">
          <div className="min-w-0 space-y-1">
            <div className="mb-1 flex flex-wrap items-center gap-1.5">
              <p className="text-muted-foreground text-[10px] font-medium tracking-wider uppercase">
                {t('common.selectedQr')}
              </p>
              <span
                className={
                  parsed.isValid
                    ? 'border-foreground/15 bg-background/70 text-foreground rounded-md border px-1.5 py-0.5 font-mono text-[10px] leading-none'
                    : 'text-destructive border-destructive/40 bg-destructive/10 rounded-md border px-1.5 py-0.5 font-mono text-[10px] leading-none'
                }
              >
                {parsed.isValid ? t('common.valid') : t('common.invalid')}
              </span>
              {parsed.scheme && (
                <span className="text-muted-foreground bg-background/70 rounded-md border px-1.5 py-0.5 font-mono text-[10px] leading-none">
                  {parsed.scheme}
                </span>
              )}
            </div>
            <CardTitle className="truncate text-base">
              {qr.title || t('common.untitledQr')}
            </CardTitle>
            <p className="text-muted-foreground truncate font-mono text-[11px]">
              {parsed.path || qr.url}
            </p>
          </div>
          <CardAction className="border-border/80 bg-background/75 shadow-foreground/5 flex items-center gap-1 rounded-md border p-1 shadow-sm">
            <QrInspectorActions
              qr={qr}
              name={name}
              canDownload={Boolean(inspectorDataUrl)}
              downloadedInspectorId={downloadedInspectorId}
              copiedShareId={copiedShareId}
              activeFilter={activeFilter}
              onDownloadPng={onDownloadPng}
              onCopyShareUrl={onCopyShareUrl}
            />
          </CardAction>
        </CardHeader>
        <CardContent className="space-y-4 pt-4">
          <div className="bg-background/65 rounded-lg border p-2 shadow-inner">
            <div className="scan-plate rounded-md border p-5 shadow-[inset_0_0_0_1px_rgba(0,0,0,0.03)]">
              <QrPreview
                title={qr.title}
                url={qr.url}
                size="inspector"
                bare
                onDataUrl={onDataUrl}
              />
            </div>
          </div>
          {qr.description && (
            <p className="text-muted-foreground text-sm leading-relaxed">{qr.description}</p>
          )}
          <div className="bg-background/70 overflow-hidden rounded-lg border">
            <div className="border-b px-3 py-2">
              <p className="text-muted-foreground text-[10px] font-medium tracking-wider uppercase">
                URL
              </p>
            </div>
            <p className="text-muted-foreground p-3 font-mono text-xs leading-relaxed break-all">
              {qr.url}
            </p>
          </div>
        </CardContent>
      </Card>
      <ParsedUrlPanel url={qr.url} />
    </>
  )
}
