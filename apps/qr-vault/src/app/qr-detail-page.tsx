import { Link, useNavigate, useRouterState } from '@tanstack/react-router'
import { AlertCircle, ArrowLeft, Check } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { NotFoundCard } from '@/app/qr-detail/not-found-card'
import { PreviewPanel } from '@/app/qr-detail/preview-panel'
import { QrDetailFormCard } from '@/app/qr-detail/qr-detail-form-card'
import { ShareUtilityPanel } from '@/app/qr-detail/share-utility-panel'
import { UrlUtilitiesPanel } from '@/app/qr-detail/url-utilities-panel'
import { useVault } from '@/app/use-vault'
import { Badge } from '@/components/shadcn-ui/badge'
import { nanoid8 } from '@/lib/ids'
import { downloadDataUrl, qrFileName } from '@/lib/qr'
import { LAST_SAVED_QR_ID_KEY, upsertQr } from '@/lib/storage'
import { buildShareUrl, parseDeepLink } from '@/lib/url'
import { useDocumentTitle } from '@/lib/use-document-title'

export function QrDetailPage() {
  const { t } = useTranslation()
  const { data, updateVault } = useVault()
  const navigate = useNavigate()
  const location = useRouterState({ select: (state) => state.location })
  const search = location.search as { url?: string; title?: string; description?: string }
  const titleRef = useRef<HTMLInputElement>(null)
  const [autoFocusTitle] = useState(() => {
    const flag = sessionStorage.getItem('qr-vault:focus-title') === '1'
    if (flag) sessionStorage.removeItem('qr-vault:focus-title')
    return flag
  })
  const isNew = location.pathname === '/new'
  const qrId = location.pathname.startsWith('/q/')
    ? decodeURIComponent(location.pathname.slice('/q/'.length))
    : ''
  const existingQr = data.qrs.find((qr) => qr.id === qrId)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [url, setUrl] = useState('')
  const [collectionIds, setCollectionIds] = useState<string[]>([])
  const [error, setError] = useState('')
  const [shareCopied, setShareCopied] = useState(false)
  const [urlCopied, setUrlCopied] = useState(false)
  const [saved, setSaved] = useState(false)
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null)
  const [pngDownloaded, setPngDownloaded] = useState(false)
  const parsed = parseDeepLink(url)
  const shareUrl = buildShareUrl({
    origin: window.location.origin,
    pathname: window.location.pathname,
    url,
    title,
    description,
  })
  useDocumentTitle(
    isNew
      ? t('qrDetail.documentNew')
      : title || existingQr?.title || t('qrDetail.documentFallback'),
  )

  useEffect(() => {
    setTitle(existingQr?.title ?? search.title ?? '')
    setDescription(existingQr?.description ?? search.description ?? '')
    setUrl(existingQr?.url ?? search.url ?? '')
    setCollectionIds(
      existingQr
        ? data.collectionItems.reduce<string[]>((ids, item) => {
            if (item.qrId === existingQr.id) ids.push(item.collectionId)
            return ids
          }, [])
        : [],
    )
    setError('')
  }, [data.collectionItems, existingQr, search.url, search.title, search.description])

  useEffect(() => {
    if (autoFocusTitle) titleRef.current?.focus()
  }, [autoFocusTitle])

  function saveQr() {
    if (!parsed.isValid) {
      setError(t('qrDetail.validUrlRequired'))
      return
    }
    const id = existingQr?.id ?? (isNew ? nanoid8() : qrId)
    updateVault((current) => upsertQr(current, { id, title, description, url, collectionIds }))
    setSaved(true)
    sessionStorage.setItem(LAST_SAVED_QR_ID_KEY, id)
    window.setTimeout(() => setSaved(false), 1200)
    void navigate({ to: '/q/$qrId', params: { qrId: id } })
  }

  function saveAsNew() {
    if (!parsed.isValid) {
      setError(t('qrDetail.validUrlRequired'))
      return
    }
    const newId = nanoid8()
    updateVault((current) =>
      upsertQr(current, { id: newId, title, description, url, collectionIds }),
    )
    sessionStorage.setItem(LAST_SAVED_QR_ID_KEY, newId)
    toast.success(t('qrDetail.savedAsNewToast'))
    void navigate({ to: '/q/$qrId', params: { qrId: newId } })
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

  if (!isNew && !existingQr) return <NotFoundCard />

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <Link
          to="/"
          className="text-muted-foreground hover:text-foreground flex items-center gap-1 text-xs font-medium"
        >
          <ArrowLeft className="size-3" /> {t('common.vault')}
        </Link>
        <Badge variant="outline" className="gap-1.5">
          {parsed.isValid ? <Check className="size-3" /> : <AlertCircle className="size-3" />}
          {parsed.isValid ? t('qrDetail.readyToSave') : t('qrDetail.invalidUrl')}
        </Badge>
      </div>

      <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[minmax(0,1fr)_440px] xl:grid-cols-[minmax(0,1fr)_460px]">
        <QrDetailFormCard
          isNew={isNew}
          canSaveAsNew={!isNew && Boolean(existingQr)}
          title={title}
          description={description}
          url={url}
          collectionIds={collectionIds}
          collections={data.collections}
          error={error}
          saved={saved}
          autoFocusTitle={autoFocusTitle}
          titleRef={titleRef}
          onTitleChange={setTitle}
          onDescriptionChange={setDescription}
          onUrlChange={setUrl}
          onCollectionIdsChange={setCollectionIds}
          onSave={saveQr}
          onSaveAsNew={saveAsNew}
        />
        <aside className="space-y-3 lg:sticky lg:top-0">
          <PreviewPanel
            title={title}
            url={url}
            isValid={parsed.isValid}
            urlCopied={urlCopied}
            pngDownloaded={pngDownloaded}
            onDataUrl={setQrDataUrl}
            onCopyUrl={() => void copyUrl()}
            onDownloadPng={downloadPng}
          />
          <UrlUtilitiesPanel parsed={parsed} />
          <ShareUtilityPanel
            shareUrl={shareUrl}
            canCopy={Boolean(shareUrl && parsed.isValid)}
            shareCopied={shareCopied}
            onCopyShareUrl={() => void copyShareUrl()}
          />
        </aside>
      </div>
    </div>
  )
}
