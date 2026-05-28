import { Link, useNavigate, useRouterState } from '@tanstack/react-router'
import {
  AlertCircle,
  ArrowLeft,
  Check,
  Copy,
  QrCode,
  Save,
  Share2,
  ShieldCheck,
} from 'lucide-react'
import { useState } from 'react'
import { QrPreview } from '@/components/qr-preview'
import { ThemeToggle } from '@/components/theme-toggle'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useVault } from '@/app/use-vault'
import { nanoid8 } from '@/lib/ids'
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

  useDocumentTitle(title ? `Share · ${title}` : 'Incoming share')

  function saveToLocal() {
    if (!parsed.isValid) return
    const id = nanoid8()
    updateVault((current) => upsertQr(current, { id, title, description, url }))
    sessionStorage.setItem('qr-vault:focus-title', '1')
    void navigate({ to: '/q/$qrId', params: { qrId: id } })
  }

  function copyUrl() {
    if (!url) return
    void navigator.clipboard.writeText(url)
    setUrlCopied(true)
    window.setTimeout(() => setUrlCopied(false), 1200)
  }

  function copyShareUrl() {
    void navigator.clipboard.writeText(window.location.href)
    setShareCopied(true)
    window.setTimeout(() => setShareCopied(false), 1200)
  }

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <header className="border-b">
        <div className="mx-auto w-full max-w-4xl flex items-center justify-between px-6 h-14">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="flex aspect-square size-7 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <QrCode className="size-3.5" />
            </div>
            <span className="font-semibold tracking-tight">QR Vault</span>
          </Link>
          <div className="flex items-center gap-3">
            <Link
              to="/"
              className="text-xs text-muted-foreground hover:text-foreground hidden sm:inline-flex items-center gap-1.5"
            >
              <ArrowLeft className="size-3" /> Back to vault
            </Link>
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="flex-1 flex flex-col">
        <div className="mx-auto w-full max-w-xl lg:max-w-4xl px-6 py-12 sm:py-16 space-y-10">
          {/* Hero - centered full width */}
          <div className="text-center space-y-4">
            <Badge variant="outline" asChild>
              <button
                type="button"
                className="gap-1.5 cursor-pointer hover:bg-muted"
                onClick={copyShareUrl}
                aria-label="Copy share URL"
                title="Copy share URL"
              >
                {shareCopied ? <Check className="size-3" /> : <Share2 className="size-3" />}
                {shareCopied ? 'Copied share URL' : 'Copy share URL'}
              </button>
            </Badge>
            <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight text-balance">
              {title || parsed.path || 'Untitled QR'}
            </h1>
            {description && (
              <p className="text-muted-foreground text-base max-w-md mx-auto text-balance">
                {description}
              </p>
            )}
          </div>

          {/* QR + Parsed: 2-col at lg+, stacked otherwise */}
          <div className="grid gap-8 lg:grid-cols-[380px_minmax(0,1fr)] lg:gap-12 lg:items-start">
            {/* QR centerpiece + validation */}
            <div className="flex flex-col items-center gap-3">
              <QrPreview url={url} title={title || 'Shared QR'} size="lg" bare />
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
                    <span className="font-mono text-muted-foreground">{parsed.scheme}://</span>
                  </>
                )}
              </div>
            </div>

            {/* Parsed details — bare content (no Card) */}
            <div className="space-y-4 lg:pt-2">
              <p className="text-[10px] uppercase tracking-wider font-medium text-muted-foreground">
                Parsed details
              </p>
              <div className="grid grid-cols-[70px_minmax(0,1fr)] gap-x-4 gap-y-2 text-xs">
                <span className="font-mono text-muted-foreground">scheme</span>
                <span className="font-mono break-all">{parsed.scheme || '—'}</span>
                <span className="font-mono text-muted-foreground">path</span>
                <span className="font-mono break-all">{parsed.path || '—'}</span>
              </div>
              {queryEntries.length > 0 && (
                <div className="space-y-2 pt-2">
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] uppercase tracking-wider font-medium text-muted-foreground">
                      Query params
                    </p>
                    <span className="text-[10px] font-mono text-muted-foreground">
                      {queryEntries.length} {queryEntries.length === 1 ? 'key' : 'keys'}
                    </span>
                  </div>
                  <div className="grid gap-1">
                    {queryEntries.map(([key, value]) => (
                      <div
                        key={key}
                        className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)] gap-2 px-2.5 py-1.5 rounded-md bg-muted/50 text-xs"
                      >
                        <code className="font-mono text-foreground truncate" title={key}>
                          {key}
                        </code>
                        <code className="font-mono text-muted-foreground truncate" title={value}>
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
              <span className="text-[10px] uppercase tracking-wider font-medium text-muted-foreground">
                Raw URL
              </span>
              <div className="p-3.5 rounded-md bg-muted/50 border">
                <p className="text-xs font-mono break-all leading-relaxed">
                  {url || 'No URL provided'}
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={saveToLocal}
                  disabled={!parsed.isValid}
                  size="lg"
                >
                  <Save /> Save to local
                </Button>
                <Button type="button" onClick={copyUrl} disabled={!url} size="lg">
                  {urlCopied ? <Check /> : <Copy />}
                  {urlCopied ? 'Copied' : 'Copy URL'}
                </Button>
              </div>
              <p className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
                <ShieldCheck className="size-3" /> Stays on this device. Nothing is uploaded.
              </p>
            </div>
          </div>
        </div>
      </main>

      <footer className="border-t">
        <div className="mx-auto w-full max-w-4xl px-6 h-12 flex items-center justify-between text-xs text-muted-foreground">
          <span className="font-mono">qr-vault · local · static</span>
          <Link to="/" className="hover:text-foreground">
            Open vault →
          </Link>
        </div>
      </footer>
    </div>
  )
}
