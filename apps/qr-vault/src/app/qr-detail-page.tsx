import { useNavigate, useRouterState } from '@tanstack/react-router'
import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { useInlineCollectionCreate } from '@/app/qr-detail/inline-collection-create'
import { NotFoundCard } from '@/app/qr-detail/not-found-card'
import { QrDetailAside } from '@/app/qr-detail/qr-detail-aside'
import { collectionIdsForQr, isQrDraftDirty, qrItemToDraft } from '@/app/qr-detail/qr-detail-draft'
import { QrDetailFormCard } from '@/app/qr-detail/qr-detail-form-card'
import { QrDetailHeader } from '@/app/qr-detail/qr-detail-header'
import {
  getQrDetailReturnFilter,
  getQrDetailRouteState,
  navigateToSavedQr,
  type QrDetailSearch,
} from '@/app/qr-detail/qr-detail-navigation'
import { useVault } from '@/app/use-vault'
import { nanoid8 } from '@/lib/ids'
import { downloadDataUrl, qrFileName } from '@/lib/qr'
import { LAST_SAVED_QR_ID_KEY, upsertQr } from '@/lib/storage'
import {
  buildShareUrl,
  compactQueryRows,
  parseDeepLink,
  queryToRows,
  type QueryRow,
} from '@/lib/url'
import { useDocumentTitle } from '@/lib/use-document-title'

export function QrDetailPage() {
  const { t } = useTranslation()
  const { data, updateVault } = useVault()
  const navigate = useNavigate()
  const location = useRouterState({ select: (state) => state.location })
  const search = location.search as QrDetailSearch
  const returnFilter = getQrDetailReturnFilter(search)
  const titleRef = useRef<HTMLInputElement>(null)
  const [autoFocusTitle] = useState(() => {
    const flag = sessionStorage.getItem('qr-vault:focus-title') === '1'
    if (flag) sessionStorage.removeItem('qr-vault:focus-title')
    return flag
  })
  const { isNew, qrId } = getQrDetailRouteState(location.pathname)
  const existingQr = data.qrs.find((qr) => qr.id === qrId)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [url, setUrl] = useState('')
  const [queryRows, setQueryRows] = useState<QueryRow[]>([])
  const [collectionIds, setCollectionIds] = useState<string[]>([])
  const [error, setError] = useState('')
  const [shareCopied, setShareCopied] = useState(false)
  const [urlCopied, setUrlCopied] = useState(false)
  const [saved, setSaved] = useState(false)
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null)
  const [pngDownloaded, setPngDownloaded] = useState(false)
  const createCollection = useInlineCollectionCreate({
    collections: data.collections,
    setCollectionIds,
    updateVault,
  })
  const parsed = parseDeepLink(url)
  const savedDraft = existingQr
    ? qrItemToDraft(existingQr, collectionIdsForQr(data.collectionItems, existingQr.id))
    : undefined
  const isDirty = isQrDraftDirty({ title, description, url, queryRows, collectionIds }, savedDraft)
  const documentTitle = isNew
    ? t('qrDetail.documentNew')
    : title || existingQr?.title || t('qrDetail.documentFallback')
  const shareUrl = buildShareUrl({
    origin: window.location.origin,
    pathname: window.location.pathname,
    url,
    title,
    description,
  })
  useDocumentTitle(documentTitle)

  useEffect(() => {
    const nextUrl = existingQr?.url ?? search.url ?? ''
    setTitle(existingQr?.title ?? search.title ?? '')
    setDescription(existingQr?.description ?? search.description ?? '')
    setUrl(nextUrl)
    setQueryRows(existingQr?.queryParams ?? queryToRows(parseDeepLink(nextUrl).query))
    setCollectionIds(existingQr ? collectionIdsForQr(data.collectionItems, existingQr.id) : [])
    setError('')
  }, [data.collectionItems, existingQr, search.url, search.title, search.description])

  useEffect(() => {
    if (autoFocusTitle) titleRef.current?.focus()
  }, [autoFocusTitle])

  function qrInput(id: string) {
    return {
      id,
      title,
      description,
      url,
      queryParams: compactQueryRows(queryRows),
      collectionIds,
    }
  }

  function saveQr() {
    if (!parsed.isValid) {
      setError(t('qrDetail.validUrlRequired'))
      return
    }
    const id = existingQr?.id ?? (isNew ? nanoid8() : qrId)
    updateVault((current) => upsertQr(current, qrInput(id)))
    setSaved(true)
    sessionStorage.setItem(LAST_SAVED_QR_ID_KEY, id)
    window.setTimeout(() => setSaved(false), 1200)
    navigateToSavedQr(navigate, id, returnFilter)
  }

  function saveAsNew() {
    if (!parsed.isValid) {
      setError(t('qrDetail.validUrlRequired'))
      return
    }
    const newId = nanoid8()
    updateVault((current) => upsertQr(current, qrInput(newId)))
    sessionStorage.setItem(LAST_SAVED_QR_ID_KEY, newId)
    toast.success(t('qrDetail.savedAsNewToast'))
    navigateToSavedQr(navigate, newId, returnFilter)
  }

  async function copyUrl() {
    if (!url) return
    try {
      await navigator.clipboard.writeText(url)
      setUrlCopied(true)
      toast.success(t('toast.copiedUrl'))
      window.setTimeout(() => setUrlCopied(false), 1200)
    } catch {
      toast.error(t('toast.couldNotCopyUrl'))
    }
  }

  async function copyShareUrl() {
    if (!shareUrl || !parsed.isValid) return
    try {
      await navigator.clipboard.writeText(shareUrl)
      setShareCopied(true)
      toast.success(t('toast.copiedShareLink'))
      window.setTimeout(() => setShareCopied(false), 1200)
    } catch {
      toast.error(t('toast.couldNotCopyShareLink'))
    }
  }

  function downloadPng() {
    if (!qrDataUrl) return
    downloadDataUrl(qrDataUrl, qrFileName(title))
    setPngDownloaded(true)
    window.setTimeout(() => setPngDownloaded(false), 1200)
  }

  function updateUrlEditor(next: { url: string; queryRows: QueryRow[] }) {
    setUrl(next.url)
    setQueryRows(next.queryRows)
  }

  if (!isNew && !existingQr) return <NotFoundCard />

  return (
    <div className="space-y-4">
      <QrDetailHeader returnFilter={returnFilter} />

      <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[minmax(0,1fr)_440px] xl:grid-cols-[minmax(0,1fr)_460px]">
        <QrDetailFormCard
          isNew={isNew}
          isEmpty={parsed.isEmpty}
          isValid={parsed.isValid}
          isDirty={isDirty}
          canSave={parsed.isValid}
          canSaveAsNew={!isNew && Boolean(existingQr)}
          title={title}
          description={description}
          url={url}
          queryRows={queryRows}
          collectionIds={collectionIds}
          collections={data.collections}
          error={error}
          saved={saved}
          autoFocusTitle={autoFocusTitle}
          titleRef={titleRef}
          onTitleChange={setTitle}
          onDescriptionChange={setDescription}
          onUrlEditorChange={updateUrlEditor}
          onCollectionIdsChange={setCollectionIds}
          onCreateCollection={createCollection}
          onSave={saveQr}
          onSaveAsNew={saveAsNew}
        />
        <QrDetailAside
          title={title}
          url={url}
          parsed={parsed}
          urlCopied={urlCopied}
          shareUrl={shareUrl}
          shareCopied={shareCopied}
          pngDownloaded={pngDownloaded}
          onDataUrl={setQrDataUrl}
          onCopyUrl={() => void copyUrl()}
          onCopyShareUrl={() => void copyShareUrl()}
          onDownloadPng={downloadPng}
        />
      </div>
    </div>
  )
}
