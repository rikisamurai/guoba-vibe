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
  const parsed = parseDeepLink(url)

  return (
    <div className="bg-muted/30 flex items-center gap-3 rounded-md border p-2.5 lg:hidden">
      <div className="w-24 shrink-0">
        <QrPreview title={title || 'QR code'} url={url} size="compact" bare />
      </div>
      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex items-center gap-1.5 text-xs font-medium">
          {parsed.isValid ? <Check className="size-3.5" /> : <AlertCircle className="size-3.5" />}
          <span>{parsed.isValid ? 'QR preview ready' : 'Awaiting valid URL'}</span>
        </div>
        <p className="text-muted-foreground truncate font-mono text-[11px]">
          {parsed.isValid ? `${parsed.scheme}://${parsed.path}` : 'Enter a scheme and path'}
        </p>
      </div>
    </div>
  )
}

export function QrDetailPage() {
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
  useDocumentTitle(isNew ? 'New QR' : title || existingQr?.title || 'QR')

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
      setError('A valid scheme and path are required.')
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
      setError('A valid scheme and path are required.')
      return
    }
    const newId = nanoid8()
    updateVault((current) =>
      upsertQr(current, { id: newId, title, description, url, collectionIds }),
    )
    sessionStorage.setItem(LAST_SAVED_QR_ID_KEY, newId)
    toast.success('Saved as new QR')
    void navigate({ to: '/q/$qrId', params: { qrId: newId } })
  }

  async function copyUrl() {
    if (!url) return
    try {
      await navigator.clipboard.writeText(url)
      setUrlCopied(true)
      toast.success('Copied URL')
      window.setTimeout(() => setUrlCopied(false), 1200)
    } catch {
      toast.error('Could not copy URL')
    }
  }

  async function copyShareUrl() {
    if (!shareUrl || !parsed.isValid) return
    try {
      await navigator.clipboard.writeText(shareUrl)
      setShareCopied(true)
      toast.success('Copied share link')
      window.setTimeout(() => setShareCopied(false), 1200)
    } catch {
      toast.error('Could not copy share link')
    }
  }

  if (!isNew && !existingQr) {
    return (
      <Card>
        <CardContent className="space-y-4 py-12 text-center">
          <p className="text-xl font-semibold">QR not found</p>
          <p className="text-muted-foreground text-sm">This QR code doesn't exist in your vault.</p>
          <Link to="/">
            <Button type="button">
              <ArrowLeft /> Back to vault
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
          <ArrowLeft className="size-3" /> Vault
        </Link>
        <Badge variant="outline" className="gap-1.5">
          {parsed.isValid ? <Check className="size-3" /> : <AlertCircle className="size-3" />}
          {parsed.isValid ? 'ready to save' : 'invalid URL'}
        </Badge>
      </div>

      <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[minmax(0,1fr)_420px]">
        <Card>
          <CardHeader className="border-b">
            <div className="min-w-0">
              <p className="text-muted-foreground mb-1 text-xs font-medium tracking-wider uppercase">
                {isNew ? 'New QR' : 'Saved QR'}
              </p>
              <CardTitle className="truncate text-2xl font-semibold tracking-tight">
                {title || 'Untitled QR'}
              </CardTitle>
            </div>
            <CardAction className="flex items-center gap-2">
              <Button onClick={saveQr} type="button" data-tour="qr-save">
                {saved ? <Check /> : <Save />}
                {saved ? 'Saved' : 'Save'}
              </Button>
              {!isNew && existingQr && (
                <Button onClick={saveAsNew} type="button" variant="outline">
                  <CopyPlus />
                  Save as New
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
                <FieldLabel htmlFor="qr-title">Title</FieldLabel>
                <Input
                  id="qr-title"
                  ref={titleRef}
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  placeholder={autoFocusTitle ? '给这个 QR 起个名字' : 'e.g. Conversion landing'}
                />
              </div>
              <div className="grid gap-1.5">
                <FieldLabel htmlFor="qr-desc">Description</FieldLabel>
                <Input
                  id="qr-desc"
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  placeholder="Optional context"
                />
              </div>
            </div>

            <div className="pt-1">
              <div className="mb-3 flex items-center gap-3">
                <Separator className="flex-1" />
                <p className="text-muted-foreground text-[10px] font-medium tracking-wider uppercase">
                  Deep link
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
                  Collections
                </p>
                <Separator className="flex-1" />
              </div>
              <div className="mb-3 flex items-center justify-between">
                <p className="text-muted-foreground text-xs">Assign to one or more collections</p>
                <Link
                  to="/collections"
                  className="text-muted-foreground hover:text-foreground flex items-center gap-1 text-xs font-medium"
                >
                  Manage <ArrowRight className="size-3" />
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
            <QrPreview title={title || 'QR code'} url={url} size="lg" onDataUrl={setQrDataUrl} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Button onClick={() => void copyUrl()} type="button" variant="outline" disabled={!url}>
              {urlCopied ? <Check /> : <Copy />}
              {urlCopied ? 'Copied' : 'Copy URL'}
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
              {pngDownloaded ? 'Saved' : 'Download PNG'}
            </Button>
          </div>
          <ParsedUrlPanel url={url} />
          <Card>
            <CardHeader className="border-b">
              <CardTitle>Share link</CardTitle>
              <CardAction>
                <Button
                  type="button"
                  variant="outline"
                  size="icon-sm"
                  onClick={() => void copyShareUrl()}
                  disabled={!shareUrl || !parsed.isValid}
                  title="Copy share URL"
                  aria-label="Copy share URL"
                >
                  {shareCopied ? <Check /> : <Share2 />}
                </Button>
              </CardAction>
            </CardHeader>
            <CardContent className="space-y-2 pt-4">
              <div className="bg-muted/50 rounded-md border p-3">
                <p className="text-foreground font-mono text-[10px] leading-relaxed break-all">
                  {shareUrl || 'Not ready'}
                </p>
              </div>
              <p className="text-muted-foreground text-xs">
                Send this hash URL to share the QR without uploading data.
              </p>
            </CardContent>
          </Card>
        </aside>
      </div>
    </div>
  )
}
