import { Check, Download, FileUp, Replace, ShieldCheck } from 'lucide-react'
import { useEffect, useState } from 'react'

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
  useDocumentTitle('Import & Export')
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
      setError('Invalid vault JSON. Local data was not changed.')
      return
    }

    setPendingData(parsed)
    setMessage(`Loaded ${parsed.qrs.length} QR codes and ${parsed.collections.length} collections.`)
  }

  function mergeImport() {
    if (!pendingData) return
    updateVault((current) => mergeVaultData(current, pendingData))
    setReplaceArmed(false)
    setMessage(`Merged ${fileName || 'vault file'} into local data.`)
  }

  function replaceImport() {
    if (!pendingData) return
    if (!replaceArmed) {
      setReplaceArmed(true)
      return
    }

    updateVault((current) => replaceVaultData(current, pendingData))
    setReplaceArmed(false)
    setMessage(`Replaced local data with ${fileName || 'vault file'}.`)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="text-muted-foreground mb-1 text-xs font-medium tracking-wider uppercase">
            Data · Backup
          </p>
          <h1 className="text-3xl font-semibold tracking-tight">Import & Export</h1>
        </div>
        <Badge variant="outline" className="gap-1.5">
          <ShieldCheck className="size-3" /> local-only
        </Badge>
      </div>

      <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="border-b">
            <CardTitle>Vault snapshot</CardTitle>
            <CardAction>
              <Badge variant="outline">JSON v1</Badge>
            </CardAction>
          </CardHeader>
          <CardContent className="space-y-5 pt-4">
            <div className="grid grid-cols-3 gap-2.5">
              <StatTile value={data.qrs.length} label="QR codes" />
              <StatTile value={data.collections.length} label="Collections" />
              <StatTile value={data.collectionItems.length} label="Assignments" />
            </div>

            <div>
              <Button type="button" onClick={exportVault} size="lg" className="w-full">
                <Download /> Export JSON snapshot
              </Button>
              <p className="text-muted-foreground mt-3 text-xs leading-relaxed">
                Downloads a single <code className="text-foreground font-mono">.json</code> file
                containing your entire vault. Store it anywhere: Git, Dropbox, a USB stick.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="border-b">
            <CardTitle>Import from file</CardTitle>
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
                aria-label="Choose vault JSON file"
                onChange={(event) => void readImportFile(event.target.files?.[0])}
                className="absolute inset-0 size-full cursor-pointer opacity-0"
              />
              <FileUp className="text-muted-foreground mx-auto mb-2 size-5" />
              <p className="mb-0.5 text-sm font-medium">
                {fileName || 'Drop or choose vault file'}
              </p>
              <p className="text-muted-foreground font-mono text-xs">
                {fileName ? 'click to replace' : 'qr-vault-export.json'}
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
                Merge into local
              </Button>
              <Button
                type="button"
                variant="destructive"
                onClick={replaceImport}
                disabled={!pendingData}
                aria-label={replaceArmed ? 'Confirm replace local data' : 'Replace local data'}
              >
                <Replace /> {replaceArmed ? 'Confirm replace' : 'Replace'}
              </Button>
            </div>

            <p className="text-muted-foreground text-xs leading-relaxed">
              <strong className="text-foreground">Merge</strong> keeps existing local items, adds
              new ones, and overwrites on ID conflicts.{' '}
              <strong className="text-foreground">Replace</strong> wipes everything and starts
              fresh; this can't be undone.
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
