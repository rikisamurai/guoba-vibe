import { Check, Download, FileUp, Replace, ShieldCheck } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { useVault } from '@/app/use-vault'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardAction, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  exportVaultJson,
  mergeVaultData,
  parseVaultData,
  replaceVaultData,
  type VaultData,
} from '@/lib/storage'
import { useDocumentTitle } from '@/lib/use-document-title'
import { cn } from '@/lib/utils'

export function ImportExportPage() {
  const { t } = useTranslation()
  useDocumentTitle(t('importExport.documentTitle'))
  const { data, updateVault } = useVault()
  const [pendingData, setPendingData] = useState<VaultData | null>(null)
  const [fileName, setFileName] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [replaceArmed, setReplaceArmed] = useState(false)

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
      t('importExport.mergedFile', {
        fileName: fileName || t('importExport.fallbackFileName'),
      }),
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
      t('importExport.replacedFile', {
        fileName: fileName || t('importExport.fallbackFileName'),
      }),
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between gap-4">
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
        <Card>
          <CardHeader className="border-b">
            <CardTitle>{t('importExport.vaultSnapshot')}</CardTitle>
            <CardAction>
              <Badge variant="outline">JSON v1</Badge>
            </CardAction>
          </CardHeader>
          <CardContent className="space-y-5 pt-4">
            <div className="grid grid-cols-3 gap-2.5">
              <StatTile value={data.qrs.length} label={t('common.qrCodes')} />
              <StatTile value={data.collections.length} label={t('common.collections')} />
              <StatTile value={data.collectionItems.length} label={t('common.assignments')} />
            </div>

            <div>
              <Button type="button" onClick={exportVault} size="lg" className="w-full">
                <Download /> {t('importExport.exportSnapshot')}
              </Button>
              <p className="text-muted-foreground mt-3 text-xs leading-relaxed">
                {t('importExport.exportDescriptionStart')}{' '}
                <code className="text-foreground font-mono">.json</code>{' '}
                {t('importExport.exportDescriptionEnd')}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="border-b">
            <CardTitle>{t('importExport.importFromFile')}</CardTitle>
            <CardAction>
              <FileUp className="text-muted-foreground size-3.5" />
            </CardAction>
          </CardHeader>
          <CardContent className="space-y-4 pt-4">
            <label
              className={cn(
                'relative block cursor-pointer rounded-md border-2 border-dashed transition-colors',
                'px-4 py-6 text-center',
                pendingData
                  ? 'border-foreground/40 bg-muted/50'
                  : 'border-border bg-card hover:bg-muted/30',
              )}
            >
              <input
                accept="application/json,.json"
                type="file"
                aria-label={t('importExport.chooseFile')}
                onChange={(event) => void readImportFile(event.target.files?.[0])}
                className="absolute inset-0 size-full cursor-pointer opacity-0"
              />
              <FileUp className="text-muted-foreground mx-auto mb-2 size-5" />
              <p className="mb-0.5 text-sm font-medium">
                {fileName || t('importExport.dropOrChoose')}
              </p>
              <p className="text-muted-foreground font-mono text-xs">
                {fileName ? t('importExport.clickToReplace') : 'qr-vault-export.json'}
              </p>
            </label>

            {message && (
              <div className="bg-muted/50 text-foreground flex items-start gap-2 rounded-md border px-3 py-2.5 text-xs">
                <Check className="mt-0.5 size-3.5 shrink-0" />
                <span>{message}</span>
              </div>
            )}
            {error && (
              <div className="border-destructive/30 bg-destructive/10 text-destructive rounded-md border px-3 py-2.5 text-xs">
                {error}
              </div>
            )}

            <div className="grid grid-cols-2 gap-2">
              <Button type="button" onClick={mergeImport} disabled={!pendingData}>
                {t('importExport.mergeIntoLocal')}
              </Button>
              <Button
                type="button"
                variant="destructive"
                onClick={replaceImport}
                disabled={!pendingData}
                aria-label={
                  replaceArmed
                    ? t('importExport.confirmReplaceLocalData')
                    : t('importExport.replaceLocalData')
                }
              >
                <Replace />{' '}
                {replaceArmed ? t('importExport.confirmReplace') : t('importExport.replace')}
              </Button>
            </div>

            <p className="text-muted-foreground text-xs leading-relaxed">
              <strong className="text-foreground">{t('importExport.mergeLabel')}</strong>{' '}
              {t('importExport.importDescriptionBeforeMerge')}{' '}
              <strong className="text-foreground">{t('importExport.replaceLabel')}</strong>{' '}
              {t('importExport.importDescriptionBeforeReplace')}
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function StatTile({ value, label }: { value: number; label: string }) {
  return (
    <div className="bg-muted/30 rounded-md border p-3">
      <div className="text-2xl leading-none font-semibold tracking-tight">{value}</div>
      <div className="text-muted-foreground mt-2 text-[10px] font-medium tracking-wider uppercase">
        {label}
      </div>
    </div>
  )
}
