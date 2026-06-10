import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { useVault } from '@/app/use-vault'
import { QrInspector } from '@/app/workspace/qr-inspector'
import { QrList } from '@/app/workspace/qr-list'
import type { ActiveFilter, WorkspaceQr } from '@/app/workspace/types'
import { WorkspaceHeader } from '@/app/workspace/workspace-header'
import { downloadDataUrl, qrFileName } from '@/lib/qr'
import { deleteQr, LAST_SAVED_QR_ID_KEY } from '@/lib/storage'
import { buildShareUrl } from '@/lib/url'
import { useDocumentTitle } from '@/lib/use-document-title'
import { getQrsForCollection, getUncategorizedQrs, searchQrs, sortQrsByRecent } from '@/lib/vault'

export function WorkspacePage() {
  const { t } = useTranslation()
  useDocumentTitle(t('workspace.documentTitle'))
  const { data, updateVault } = useVault()
  const [search, setSearch] = useState('')
  const [selectedId, setSelectedId] = useState('')
  const [activeFilter, setActiveFilter] = useState<ActiveFilter>('all')
  const [armedDelete, setArmedDelete] = useState('')
  const [copiedUrlId, setCopiedUrlId] = useState('')
  const [copiedShareId, setCopiedShareId] = useState('')
  const [inspectorDataUrl, setInspectorDataUrl] = useState<string | null>(null)
  const [downloadedInspectorId, setDownloadedInspectorId] = useState('')
  const pendingSavedIdRef = useRef<string | null>(null)
  const listItemRefs = useRef(new Map<string, HTMLDivElement>())

  useEffect(() => {
    if (!armedDelete) return
    function onDocClick(event: MouseEvent) {
      // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- DOM event target is EventTarget; narrowing to HTMLElement to call closest()
      const target = event.target as HTMLElement | null
      if (target?.closest(`[data-armed-for="${armedDelete}"]`)) return
      setArmedDelete('')
    }
    const attach = window.setTimeout(() => document.addEventListener('click', onDocClick), 0)
    const autoCancel = window.setTimeout(() => setArmedDelete(''), 3000)
    return () => {
      window.clearTimeout(attach)
      window.clearTimeout(autoCancel)
      document.removeEventListener('click', onDocClick)
    }
  }, [armedDelete])

  useEffect(() => {
    if (pendingSavedIdRef.current === null) {
      const id = sessionStorage.getItem(LAST_SAVED_QR_ID_KEY)
      if (id) sessionStorage.removeItem(LAST_SAVED_QR_ID_KEY)
      pendingSavedIdRef.current = id ?? ''
    }

    const pendingSavedId = pendingSavedIdRef.current
    if (!pendingSavedId) return
    if (!data.qrs.some((qr) => qr.id === pendingSavedId)) {
      pendingSavedIdRef.current = ''
      return
    }

    setSelectedId(pendingSavedId)
    const frame = window.requestAnimationFrame(() => {
      listItemRefs.current.get(pendingSavedId)?.scrollIntoView({ block: 'nearest' })
      pendingSavedIdRef.current = ''
    })

    return () => window.cancelAnimationFrame(frame)
  }, [data.qrs])

  function handleDelete(qrId: string) {
    const deletedQr = data.qrs.find((qr) => qr.id === qrId)
    const deletedCollectionItems = data.collectionItems.filter((item) => item.qrId === qrId)

    updateVault((current) => deleteQr(current, qrId))
    setArmedDelete('')
    if (selectedId === qrId) setSelectedId('')
    if (!deletedQr) return

    toast.success(t('toast.deletedQr'), {
      action: {
        label: t('toast.undo'),
        onClick: () => restoreDeletedQr(deletedQr, deletedCollectionItems),
      },
    })
  }

  function restoreDeletedQr(
    deletedQr: WorkspaceQr,
    deletedCollectionItems: typeof data.collectionItems,
  ) {
    updateVault((current) => {
      if (current.qrs.some((qr) => qr.id === deletedQr.id)) return current
      const existingItems = new Set(
        current.collectionItems.map((item) => `${item.collectionId}:${item.qrId}`),
      )
      const restoredItems = deletedCollectionItems.filter(
        (item) => !existingItems.has(`${item.collectionId}:${item.qrId}`),
      )
      return {
        ...current,
        qrs: [...current.qrs, deletedQr],
        collectionItems: [...current.collectionItems, ...restoredItems],
      }
    })
    setSelectedId(deletedQr.id)
  }

  async function copyUrl(qr: WorkspaceQr) {
    try {
      await navigator.clipboard.writeText(qr.url)
      setCopiedUrlId(qr.id)
      toast.success(t('toast.copiedUrl'))
      window.setTimeout(() => setCopiedUrlId(''), 1200)
    } catch {
      toast.error(t('toast.couldNotCopyUrl'))
    }
  }

  async function copyShareUrl(qr: WorkspaceQr) {
    const shareUrl = buildShareUrl({
      origin: window.location.origin,
      pathname: window.location.pathname,
      url: qr.url,
      title: qr.title,
      description: qr.description,
    })
    try {
      await navigator.clipboard.writeText(shareUrl)
      setCopiedShareId(qr.id)
      toast.success(t('toast.copiedShareLink'))
      window.setTimeout(() => setCopiedShareId(''), 1200)
    } catch {
      toast.error(t('toast.couldNotCopyShareLink'))
    }
  }

  function downloadInspectorPng(qr: WorkspaceQr) {
    if (!inspectorDataUrl) return
    downloadDataUrl(inspectorDataUrl, qrFileName(qr.title))
    setDownloadedInspectorId(qr.id)
    window.setTimeout(() => setDownloadedInspectorId(''), 1200)
  }

  const uncategorizedCount = getUncategorizedQrs(data).length
  const baseQrs =
    activeFilter === 'all'
      ? data.qrs
      : activeFilter === 'uncategorized'
        ? getUncategorizedQrs(data)
        : getQrsForCollection(data, activeFilter)
  const visibleQrs = sortQrsByRecent(searchQrs({ ...data, qrs: baseQrs }, search))
  const selectedQr = data.qrs.find((qr) => qr.id === selectedId) ?? visibleQrs[0]

  return (
    <div className="grid grid-cols-1 items-start gap-5 lg:h-[calc(100svh-5.5rem)] lg:grid-cols-[minmax(0,1fr)_360px] lg:items-stretch lg:overflow-hidden xl:grid-cols-[minmax(500px,1fr)_480px] 2xl:grid-cols-[minmax(560px,1fr)_560px]">
      <div className="flex min-h-0 flex-col gap-4 lg:h-full lg:overflow-hidden">
        <WorkspaceHeader
          data={data}
          uncategorizedCount={uncategorizedCount}
          activeFilter={activeFilter}
          onFilterChange={setActiveFilter}
          search={search}
          onSearchChange={setSearch}
          visibleCount={visibleQrs.length}
        />
        <div className="min-h-0 space-y-2 lg:flex-1 lg:[scrollbar-gutter:stable] lg:overflow-y-auto lg:pr-3">
          <QrList
            qrs={visibleQrs}
            selectedId={selectedQr?.id}
            search={search}
            armedDeleteId={armedDelete}
            copiedUrlId={copiedUrlId}
            itemRefs={listItemRefs}
            onSelect={setSelectedId}
            onCopyUrl={(qr) => void copyUrl(qr)}
            onArmDelete={setArmedDelete}
            onDelete={handleDelete}
          />
        </div>
      </div>

      <aside className="min-h-0 space-y-3 lg:h-full lg:[scrollbar-gutter:stable] lg:overflow-y-auto lg:pt-px lg:pr-3 lg:pb-1 lg:pl-px">
        <QrInspector
          qr={selectedQr}
          search={search}
          inspectorDataUrl={inspectorDataUrl}
          downloadedInspectorId={downloadedInspectorId}
          copiedShareId={copiedShareId}
          onDataUrl={setInspectorDataUrl}
          onDownloadPng={downloadInspectorPng}
          onCopyShareUrl={(qr) => void copyShareUrl(qr)}
        />
      </aside>
    </div>
  )
}
