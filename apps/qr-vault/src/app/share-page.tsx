import { useNavigate, useRouterState } from '@tanstack/react-router'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { FOCUS_QR_TITLE_KEY } from '@/app/qr-session'
import { ShareActions } from '@/app/share/share-actions'
import { ShareFooter } from '@/app/share/share-footer'
import { ShareHeader } from '@/app/share/share-header'
import { ShareHero } from '@/app/share/share-hero'
import { ShareQrDetails } from '@/app/share/share-qr-details'
import { useVault } from '@/app/vault/use-vault'
import { downloadDataUrl, qrFileName } from '@/lib/qr'
import { parseDeepLink } from '@/lib/url'
import { useDocumentTitle } from '@/lib/use-document-title'

export function SharePage() {
  const { t } = useTranslation()
  const { qr } = useVault()
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
  const [shareCopied, setShareCopied] = useState(false)
  const [urlCopied, setUrlCopied] = useState(false)
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null)
  const [pngDownloaded, setPngDownloaded] = useState(false)
  useDocumentTitle(title ? t('share.documentShare', { title }) : t('share.documentIncoming'))

  function saveToLocal() {
    if (!parsed.isValid) return
    const result = qr.saveShared({ title, description, url })
    if (result.kind === 'existing') {
      toast.success(t('share.alreadyInVaultToast'))
      void navigate({ to: '/q/$qrId', params: { qrId: result.id } })
      return
    }

    toast.success(t('share.savedToVaultToast'))
    sessionStorage.setItem(FOCUS_QR_TITLE_KEY, '1')
    void navigate({ to: '/q/$qrId', params: { qrId: result.id } })
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
    try {
      await navigator.clipboard.writeText(window.location.href)
      setShareCopied(true)
      toast.success(t('toast.copiedShareLink'))
      window.setTimeout(() => setShareCopied(false), 1200)
    } catch {
      toast.error(t('toast.couldNotCopyShareLink'))
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
      <ShareHeader />
      <main className="flex flex-1 flex-col">
        <div className="mx-auto w-full max-w-xl space-y-8 px-6 py-10 sm:py-14 lg:max-w-5xl">
          <ShareHero
            title={title}
            fallbackTitle={parsed.path}
            description={description}
            shareCopied={shareCopied}
            onCopyShareUrl={() => void copyShareUrl()}
          />
          <ShareQrDetails title={title} url={url} parsed={parsed} onDataUrl={setQrDataUrl} />
          <ShareActions
            url={url}
            isValid={parsed.isValid}
            canDownload={Boolean(qrDataUrl)}
            urlCopied={urlCopied}
            pngDownloaded={pngDownloaded}
            onSaveToLocal={saveToLocal}
            onDownloadPng={downloadPng}
            onCopyUrl={() => void copyUrl()}
          />
        </div>
      </main>
      <ShareFooter />
    </div>
  )
}
