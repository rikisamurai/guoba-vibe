import { useNavigate, useRouterState } from '@tanstack/react-router'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { ShareActions } from '@/app/share/share-actions'
import { ShareFooter } from '@/app/share/share-footer'
import { ShareHeader } from '@/app/share/share-header'
import { ShareHero } from '@/app/share/share-hero'
import { ShareQrDetails } from '@/app/share/share-qr-details'
import { useVault } from '@/app/use-vault'
import { nanoid8 } from '@/lib/ids'
import { downloadDataUrl, qrFileName } from '@/lib/qr'
import { upsertQr } from '@/lib/storage'
import { parseDeepLink } from '@/lib/url'
import { useDocumentTitle } from '@/lib/use-document-title'

export function SharePage() {
  const { t } = useTranslation()
  const { data, updateVault } = useVault()
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
    const existingQr = data.qrs.find((qr) => qr.url === url)
    if (existingQr) {
      toast.success(t('share.alreadyInVaultToast'))
      void navigate({ to: '/q/$qrId', params: { qrId: existingQr.id } })
      return
    }

    const id = nanoid8()
    updateVault((current) => upsertQr(current, { id, title, description, url }))
    toast.success(t('share.savedToVaultToast'))
    sessionStorage.setItem('qr-vault:focus-title', '1')
    void navigate({ to: '/q/$qrId', params: { qrId: id } })
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
        <div className="mx-auto w-full max-w-xl space-y-10 px-6 py-12 sm:py-16 lg:max-w-4xl">
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
