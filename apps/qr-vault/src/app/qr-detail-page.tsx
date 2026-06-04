import { Link, useNavigate, useRouterState } from '@tanstack/react-router'
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Check,
  Copy,
  CopyPlus,
  Download,
  Save,
  Share2,
} from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { useVault } from '@/app/use-vault'
import { CollectionPicker } from '@/components/collection-picker'
import { ParsedUrlPanel } from '@/components/parsed-url-panel'
import { QrPreview } from '@/components/qr-preview'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardAction, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { UrlEditor } from '@/components/url-editor'
import { nanoid8 } from '@/lib/ids'
import { downloadDataUrl, qrFileName } from '@/lib/qr'
import { LAST_SAVED_QR_ID_KEY, upsertQr } from '@/lib/storage'
import { buildShareUrl, parseDeepLink } from '@/lib/url'
import { useDocumentTitle } from '@/lib/use-document-title'

function FieldLabel({ htmlFor, children }: { htmlFor?: string; children: React.ReactNode }) {
  return (
    <Label
      htmlFor={htmlFor}
      className="text-muted-foreground text-[10px] font-medium tracking-wider uppercase"
    >
      {children}
    </Label>
  )
}

function MobileUrlPreview({ title, url }: { title: string; url: string }) {
  const { t } = useTranslation()
  const parsed = parseDeepLink(url)

  return (
    <div className="bg-muted/30 flex items-center gap-3 rounded-md border p-2.5 lg:hidden">
      <div className="w-24 shrink-0">
        <QrPreview title={title || t('common.qrCode')} url={url} size="compact" bare />
      </div>
      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex items-center gap-1.5 text-xs font-medium">
          {parsed.isValid ? <Check className="size-3.5" /> : <AlertCircle className="size-3.5" />}
          <span>{parsed.isValid ? t('qrDetail.previewReady') : t('common.awaitingValidUrl')}</span>
        </div>
        <p className="text-muted-foreground truncate font-mono text-[11px]">
          {parsed.isValid ? `${parsed.scheme}://${parsed.path}` : t('qrDetail.enterSchemeAndPath')}
        </p>
      </div>
    </div>
  )
}

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
    const nextCollectionIds = existingQr
      ? data.collectionItems.reduce<string[]>((ids, item) => {
          if (item.qrId === existingQr.id) ids.push(item.collectionId)
          return ids
        }, [])
      : []
    setCollectionIds(nextCollectionIds)
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
    updateVault((current) =>
      upsertQr(current, {
        id,
        title,
        description,
        url,
        collectionIds,
      }),
    )
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

  if (!isNew && !existingQr) {
    return (
      <Card>
        <CardContent className="space-y-4 py-12 text-center">
          <p className="text-xl font-semibold">{t('qrDetail.notFoundTitle')}</p>
          <p className="text-muted-foreground text-sm">{t('qrDetail.notFoundDescription')}</p>
          <Link to="/">
            <Button type="button">
              <ArrowLeft /> {t('common.backToVault')}
            </Button>
          </Link>
        </CardContent>
      </Card>
    )
  }

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

      <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[minmax(0,1fr)_420px]">
        <Card>
          <CardHeader className="border-b">
            <div className="min-w-0">
              <p className="text-muted-foreground mb-1 text-xs font-medium tracking-wider uppercase">
                {isNew ? t('qrDetail.newQr') : t('qrDetail.savedQr')}
              </p>
              <CardTitle className="truncate text-2xl font-semibold tracking-tight">
                {title || t('common.untitledQr')}
              </CardTitle>
            </div>
            <CardAction className="flex items-center gap-2">
              <Button onClick={saveQr} type="button" data-tour="qr-save">
                {saved ? <Check /> : <Save />}
                {saved ? t('common.saved') : t('common.save')}
              </Button>
              {!isNew && existingQr && (
                <Button onClick={saveAsNew} type="button" variant="outline">
                  <CopyPlus />
                  {t('qrDetail.saveAsNew')}
                </Button>
              )}
            </CardAction>
          </CardHeader>

          <CardContent className="space-y-5 pt-4">
            {error && (
              <div className="border-destructive/30 bg-destructive/10 text-destructive rounded-md border px-3 py-2.5 text-sm">
                {error}
              </div>
            )}

            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <div className="grid gap-1.5">
                <FieldLabel htmlFor="qr-title">{t('common.title')}</FieldLabel>
                <Input
                  id="qr-title"
                  ref={titleRef}
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  placeholder={
                    autoFocusTitle
                      ? t('qrDetail.autoFocusTitlePlaceholder')
                      : t('qrDetail.titlePlaceholder')
                  }
                />
              </div>
              <div className="grid gap-1.5">
                <FieldLabel htmlFor="qr-desc">{t('common.description')}</FieldLabel>
                <Input
                  id="qr-desc"
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  placeholder={t('qrDetail.descriptionPlaceholder')}
                />
              </div>
            </div>

            <div className="pt-1">
              <div className="mb-3 flex items-center gap-3">
                <Separator className="flex-1" />
                <p className="text-muted-foreground text-[10px] font-medium tracking-wider uppercase">
                  {t('qrDetail.deeplink')}
                </p>
                <Separator className="flex-1" />
              </div>
              <UrlEditor value={url} onChange={setUrl}>
                <MobileUrlPreview title={title} url={url} />
              </UrlEditor>
            </div>

            <div className="pt-1">
              <div className="mb-3 flex items-center gap-3">
                <Separator className="flex-1" />
                <p className="text-muted-foreground text-[10px] font-medium tracking-wider uppercase">
                  {t('common.collections')}
                </p>
                <Separator className="flex-1" />
              </div>
              <div className="mb-3 flex items-center justify-between">
                <p className="text-muted-foreground text-xs">{t('qrDetail.assignCollections')}</p>
                <Link
                  to="/collections"
                  className="text-muted-foreground hover:text-foreground flex items-center gap-1 text-xs font-medium"
                >
                  {t('common.manage')} <ArrowRight className="size-3" />
                </Link>
              </div>
              <CollectionPicker
                collections={data.collections}
                selectedIds={collectionIds}
                onChange={setCollectionIds}
              />
            </div>
          </CardContent>
        </Card>

        <aside className="space-y-4 lg:sticky lg:top-0">
          <div data-tour="qr-preview" className="hidden lg:block">
            <QrPreview
              title={title || t('common.qrCode')}
              url={url}
              size="lg"
              onDataUrl={setQrDataUrl}
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Button onClick={() => void copyUrl()} type="button" variant="outline" disabled={!url}>
              {urlCopied ? <Check /> : <Copy />}
              {urlCopied ? t('common.copied') : t('common.copyUrl')}
            </Button>
            <Button
              onClick={() => {
                if (!qrDataUrl) return
                downloadDataUrl(qrDataUrl, qrFileName(title))
                setPngDownloaded(true)
                window.setTimeout(() => setPngDownloaded(false), 1200)
              }}
              type="button"
              variant="outline"
              disabled={!qrDataUrl}
            >
              {pngDownloaded ? <Check /> : <Download />}
              {pngDownloaded ? t('common.saved') : t('common.downloadPng')}
            </Button>
          </div>
          <ParsedUrlPanel url={url} />
          <Card>
            <CardHeader className="border-b">
              <CardTitle>{t('common.shareLink')}</CardTitle>
              <CardAction>
                <Button
                  type="button"
                  variant="outline"
                  size="icon-sm"
                  onClick={() => void copyShareUrl()}
                  disabled={!shareUrl || !parsed.isValid}
                  title={t('qrDetail.copyShareUrl')}
                  aria-label={t('qrDetail.copyShareUrl')}
                >
                  {shareCopied ? <Check /> : <Share2 />}
                </Button>
              </CardAction>
            </CardHeader>
            <CardContent className="space-y-2 pt-4">
              <div className="bg-muted/50 rounded-md border p-3">
                <p className="text-foreground font-mono text-[10px] leading-relaxed break-all">
                  {shareUrl || t('common.notReady')}
                </p>
              </div>
              <p className="text-muted-foreground text-xs">{t('qrDetail.shareDescription')}</p>
            </CardContent>
          </Card>
        </aside>
      </div>
    </div>
  )
}
