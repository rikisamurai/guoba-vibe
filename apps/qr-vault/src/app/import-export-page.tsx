import { ShieldCheck } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { ImportCard } from '@/app/import-export/import-card'
import { SnapshotCard } from '@/app/import-export/snapshot-card'
import { createLatestFileReader } from '@/app/latest-file-reader'
import { useVault } from '@/app/vault/use-vault'
import type { InvalidImport, VaultImport } from '@/app/vault/vault-types'
import { Badge } from '@/components/shadcn-ui/badge'
import { useDocumentTitle } from '@/lib/use-document-title'

export function ImportExportPage() {
  const { t } = useTranslation()
  useDocumentTitle(t('importExport.documentTitle'))
  const { view, transfer } = useVault()
  const [pendingData, setPendingData] = useState<VaultImport | null>(null)
  const [fileName, setFileName] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [invalid, setInvalid] = useState<InvalidImport | null>(null)
  const [replaceArmed, setReplaceArmed] = useState(false)
  const [fileReader] = useState(createLatestFileReader)
  const pendingCounts = pendingData?.counts ?? null

  useEffect(() => {
    if (!replaceArmed) return
    const timeout = window.setTimeout(() => setReplaceArmed(false), 3000)
    return () => window.clearTimeout(timeout)
  }, [replaceArmed])

  function exportVault() {
    const blob = new Blob([transfer.exportJSON()], { type: 'application/json' })
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
    setInvalid(null)
    setReplaceArmed(false)
    setFileName(file?.name ?? '')

    const read = await fileReader.read(file)
    if (read.kind === 'empty' || read.kind === 'stale') return
    if (read.kind === 'failed') {
      setError(t('importExport.fileReadFailed'))
      return
    }
    const parsed: InvalidImport | VaultImport = transfer.inspect(read.raw)
    if (parsed.kind === 'invalid') {
      setInvalid(parsed)
      setError(t('importExport.invalidJson'))
      return
    }

    setPendingData(parsed)
    setMessage(
      t('importExport.loadedSummary', {
        qrCount: parsed.counts.qrs,
        collectionCount: parsed.counts.collections,
      }),
    )
  }

  function mergeImport() {
    if (!pendingData) return
    setError('')
    try {
      transfer.apply(pendingData, 'merge')
    } catch {
      setMessage('')
      setError(t('importExport.writeFailed'))
      return
    }
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

    setError('')
    try {
      transfer.apply(pendingData, 'replace')
    } catch {
      setMessage('')
      setError(t('importExport.writeFailed'))
      return
    }
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
        <SnapshotCard counts={view.counts} onExport={exportVault} />
        <ImportCard
          hasPendingData={Boolean(pendingData)}
          pendingCounts={pendingCounts}
          fileName={fileName}
          message={message}
          error={error}
          invalid={invalid}
          replaceArmed={replaceArmed}
          onFileChange={(file) => void readImportFile(file)}
          onMerge={mergeImport}
          onReplace={replaceImport}
        />
      </div>
    </div>
  )
}
