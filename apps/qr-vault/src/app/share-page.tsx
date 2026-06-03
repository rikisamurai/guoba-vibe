import { Link, useNavigate, useRouterState } from '@tanstack/react-router'
import {
  AlertCircle,
  ArrowLeft,
  Check,
  Copy,
  Download,
  QrCode,
  Save,
  Share2,
  ShieldCheck,
} from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'

import { useVault } from '@/app/use-vault'
import { QrPreview } from '@/components/qr-preview'
import { ThemeToggle } from '@/components/theme-toggle'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { nanoid8 } from '@/lib/ids'
import { downloadDataUrl, qrFileName } from '@/lib/qr'
import { upsertQr } from '@/lib/storage'
import { parseDeepLink } from '@/lib/url'
import { useDocumentTitle } from '@/lib/use-document-title'

export function SharePage() {
  const { updateVault } = useVault()
  const navigate = useNavigate()
  const search = useRouterState({ select: (state) => state.location.search }) as {
    url?: string
    title?: string
    description?: string
  }
  const url = search.url ?? ''
  const title = search.title ?? ''
  const description = search.description ?? ''
  const parsed = parseDeepLink(url)
  const queryEntries = Object.entries(parsed.query)
  const [shareCopied, setShareCopied] = useState(false)
  const [urlCopied, setUrlCopied] = useState(false)
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null)
  const [pngDownloaded, setPngDownloaded] = useState(false)

  useDocumentTitle(title ? `Share · ${title}` : 'Incoming share')

  function saveToLocal() {
    if (!parsed.isValid) return
    const id = nanoid8()
    updateVault((current) => upsertQr(current, { id, title, description, url }))
    sessionStorage.setItem('qr-vault:focus-title', '1')
    void navigate({ to: '/q/$qrId', params: { qrId: id } })
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
    try {
      await navigator.clipboard.writeText(window.location.href)
      setShareCopied(true)
      toast.success('Copied share link')
      window.setTimeout(() => setShareCopied(false), 1200)
    } catch {
      toast.error('Could not copy share link')
    }
  }

  function downloadPng() {
    if (!qrDataUrl) return
    downloadDataUrl(qrDataUrl, qrFileName(title || parsed.path))
    setPngDownloaded(true)
    window.setTimeout(() => setPngDownloaded(false), 1200)
  }

  return (
    <div className="bg-background text-foreground flex min-h-screen flex-col">
      <header className="border-b">
        <div className="mx-auto flex h-14 w-full max-w-4xl items-center justify-between px-6">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="bg-primary text-primary-foreground flex aspect-square size-7 items-center justify-center rounded-md">
              <QrCode className="size-3.5" />
            </div>
            <span className="font-semibold tracking-tight">QR Vault</span>
          </Link>
          <div className="flex items-center gap-3">
            <Link
              to="/"
              className="text-muted-foreground hover:text-foreground hidden items-center gap-1.5 text-xs sm:inline-flex"
            >
              <ArrowLeft className="size-3" /> Back to vault
            </Link>
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="flex flex-1 flex-col">
        <div className="mx-auto w-full max-w-xl space-y-10 px-6 py-12 sm:py-16 lg:max-w-4xl">
          {/* Hero - centered full width */}
          <div className="space-y-4 text-center">
            <Badge variant="outline" asChild>
              <button
                type="button"
                className="hover:bg-muted cursor-pointer gap-1.5"
                onClick={() => void copyShareUrl()}
                aria-label="Copy share URL"
                title="Copy share URL"
              >
                {shareCopied ? <Check className="size-3" /> : <Share2 className="size-3" />}
                {shareCopied ? 'Copied share URL' : 'Copy share URL'}
              </button>
            </Badge>
            <h1 className="text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
              {title || parsed.path || 'Untitled QR'}
            </h1>
            {description && (
              <p className="text-muted-foreground mx-auto max-w-md text-base text-balance">
                {description}
              </p>
            )}
          </div>

          {/* QR + Parsed: 2-col at lg+, stacked otherwise */}
          <div className="grid gap-8 lg:grid-cols-[380px_minmax(0,1fr)] lg:items-start lg:gap-12">
            {/* QR centerpiece + validation */}
            <div className="flex flex-col items-center gap-3">
              <QrPreview
                url={url}
                title={title || 'Shared QR'}
                size="lg"
                bare
                onDataUrl={setQrDataUrl}
              />
              <div className="flex items-center gap-2 text-xs">
                {parsed.isValid ? (
                  <Check className="size-3.5" />
                ) : (
                  <AlertCircle className="size-3.5" />
                )}
                <span className="font-medium">
                  {parsed.isValid ? 'Valid deep link' : 'Invalid URL'}
                </span>
                {parsed.scheme && (
                  <>
                    <span className="text-muted-foreground">·</span>
                    <span className="text-muted-foreground font-mono">{parsed.scheme}://</span>
                  </>
                )}
              </div>
            </div>

            {/* Parsed details — bare content (no Card) */}
            <div className="space-y-4 lg:pt-2">
              <p className="text-muted-foreground text-[10px] font-medium tracking-wider uppercase">
                Parsed details
              </p>
              <div className="grid grid-cols-[70px_minmax(0,1fr)] gap-x-4 gap-y-2 text-xs">
                <span className="text-muted-foreground font-mono">scheme</span>
                <span className="font-mono break-all">{parsed.scheme || '—'}</span>
                <span className="text-muted-foreground font-mono">path</span>
                <span className="font-mono break-all">{parsed.path || '—'}</span>
              </div>
              {queryEntries.length > 0 && (
                <div className="space-y-2 pt-2">
                  <div className="flex items-center justify-between">
                    <p className="text-muted-foreground text-[10px] font-medium tracking-wider uppercase">
                      Query params
                    </p>
                    <span className="text-muted-foreground font-mono text-[10px]">
                      {queryEntries.length} {queryEntries.length === 1 ? 'key' : 'keys'}
                    </span>
                  </div>
                  <div className="grid gap-1">
                    {queryEntries.map(([key, value]) => (
                      <div
                        key={key}
                        className="bg-muted/50 grid grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)] gap-2 rounded-md px-2.5 py-1.5 text-xs"
                      >
                        <code className="text-foreground truncate font-mono" title={key}>
                          {key}
                        </code>
                        <code className="text-muted-foreground truncate font-mono" title={value}>
                          {value || '""'}
                        </code>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Raw URL + CTA — always narrow + centered */}
          <div className="mx-auto w-full max-w-xl space-y-6">
            <div className="space-y-1.5">
              <span className="text-muted-foreground text-[10px] font-medium tracking-wider uppercase">
                Raw URL
              </span>
              <div className="bg-muted/50 rounded-md border p-3.5">
                <p className="font-mono text-xs leading-relaxed break-all">
                  {url || 'No URL provided'}
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <div className="grid gap-2 sm:grid-cols-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={saveToLocal}
                  disabled={!parsed.isValid}
                  size="lg"
                >
                  <Save /> Save to local
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={downloadPng}
                  disabled={!qrDataUrl}
                  size="lg"
                >
                  {pngDownloaded ? <Check /> : <Download />}
                  {pngDownloaded ? 'Saved' : 'Download'}
                </Button>
                <Button type="button" onClick={() => void copyUrl()} disabled={!url} size="lg">
                  {urlCopied ? <Check /> : <Copy />}
                  {urlCopied ? 'Copied' : 'Copy URL'}
                </Button>
              </div>
              <p className="text-muted-foreground flex items-center justify-center gap-1.5 text-xs">
                <ShieldCheck className="size-3" /> Stays on this device. Nothing is uploaded.
              </p>
            </div>
          </div>
        </div>
      </main>

      <footer className="border-t">
        <div className="text-muted-foreground mx-auto flex h-12 w-full max-w-4xl items-center justify-between px-6 text-xs">
          <span className="font-mono">qr-vault · local · static</span>
          <Link to="/" className="hover:text-foreground">
            Open vault →
          </Link>
        </div>
      </footer>
    </div>
  )
}
