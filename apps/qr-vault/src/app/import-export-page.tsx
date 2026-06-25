import { ShieldCheck } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { ImportCard } from '@/app/import-export/import-card'
import { SnapshotCard } from '@/app/import-export/snapshot-card'
import { useVault } from '@/app/use-vault'
import { Badge } from '@/components/shadcn-ui/badge'
import {
  exportVaultJson,
  mergeVaultData,
  parseVaultData,
  replaceVaultData,
  type VaultData,
} from '@/lib/storage'
import { useDocumentTitle } from '@/lib/use-document-title'

export function ImportExportPage() {
  const { t } = useTranslation()
  useDocumentTitle(t('importExport.documentTitle'))
  const { data, updateVault } = useVault()
  const [pendingData, setPendingData] = useState<VaultData | null>(null)
  const [fileName, setFileName] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [replaceArmed, setReplaceArmed] = useState(false)
  const pendingCounts = pendingData
    ? {
        qrs: pendingData.qrs.length,
        collections: pendingData.collections.length,
        assignments: pendingData.collectionItems.length,
      }
    : null

  useEffect(() => {
    if (!replaceArmed) return
    const timeout = window.setTimeout(() => setReplaceArmed(false), 3000)
    return () => window.clearTimeout(timeout)
  }, [replaceArmed])

  function exportVault() {
    const blob = new Blob([exportVaultJson(data)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'qr-vault-export.json'
    link.click()
    URL.revokeObjectURL(url)
  }

  async function readImportFile(file: File | undefined) {
    setMessage('')
    setError('')
    setPendingData(null)
    setReplaceArmed(false)
    setFileName(file?.name ?? '')
    if (!file) return

    const raw = await file.text()
    const parsed = parseVaultData(raw)
    if (!parsed) {
      setError(t('importExport.invalidJson'))
      return
    }

    setPendingData(parsed)
    setMessage(
      t('importExport.loadedSummary', {
        qrCount: parsed.qrs.length,
        collectionCount: parsed.collections.length,
      }),
    )
  }

  function mergeImport() {
    if (!pendingData) return
    updateVault((current) => mergeVaultData(current, pendingData))
    setReplaceArmed(false)
    setMessage(
      t('importExport.mergedFile', { fileName: fileName || t('importExport.fallbackFileName') }),
    )
  }

  function replaceImport() {
    if (!pendingData) return
    if (!replaceArmed) {
      setReplaceArmed(true)
      return
    }

    updateVault((current) => replaceVaultData(current, pendingData))
    setReplaceArmed(false)
    setMessage(
      t('importExport.replacedFile', { fileName: fileName || t('importExport.fallbackFileName') }),
    )
  }

  return (
    <div className="space-y-4">
      <div className="bg-card/70 signal-panel flex items-end justify-between gap-4 rounded-lg border p-4 backdrop-blur-sm">
        <div>
          <p className="text-muted-foreground mb-1 text-xs font-medium tracking-wider uppercase">
            {t('importExport.eyebrow')}
          </p>
          <h1 className="text-3xl font-semibold tracking-tight">{t('importExport.title')}</h1>
        </div>
        <Badge variant="outline" className="gap-1.5">
          <ShieldCheck className="size-3" /> {t('common.localOnly')}
        </Badge>
      </div>

      <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-2">
        <SnapshotCard data={data} onExport={exportVault} />
        <ImportCard
          hasPendingData={Boolean(pendingData)}
          pendingCounts={pendingCounts}
          fileName={fileName}
          message={message}
          error={error}
          replaceArmed={replaceArmed}
          onFileChange={(file) => void readImportFile(file)}
          onMerge={mergeImport}
          onReplace={replaceImport}
        />
      </div>
    </div>
  )
}
