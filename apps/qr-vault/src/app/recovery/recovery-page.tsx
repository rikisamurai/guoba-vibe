import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { createLatestFileReader } from '@/app/latest-file-reader'
import { RecoverySequence } from '@/app/recovery/recovery-sequence'
import { RecoverySummaryCard } from '@/app/recovery/recovery-summary-card'
import type { RepairCandidate } from '@/app/recovery/recovery-types'
import { decodeVaultDocument } from '@/app/vault/vault-document-decoder'
import type { ReadyVault, RecoveringVault } from '@/app/vault/vault-open'
import { useArmedAction } from '@/hooks/use-armed-action'
import { useDocumentTitle } from '@/lib/use-document-title'

type RecoveryPageProps = Readonly<{
  recovery: RecoveringVault
  onReady: (ready: ReadyVault) => void
}>

export function RecoveryPage({ recovery, onReady }: RecoveryPageProps) {
  const { t } = useTranslation()
  useDocumentTitle(t('recovery.documentTitle'))
  const [candidate, setCandidate] = useState<RepairCandidate | null>(null)
  const [error, setError] = useState('')
  const [fileReader] = useState(createLatestFileReader)
  const armed = useArmedAction()
  const resetArmed = armed.armedId === 'vault-reset'

  function finish(ready: ReadyVault) {
    window.location.hash = '#/'
    onReady(ready)
  }

  async function readRepairFile(file: File | undefined) {
    armed.cancel()
    setCandidate(null)
    setError('')
    const read = await fileReader.read(file)
    if (read.kind === 'empty' || read.kind === 'stale') return
    if (read.kind === 'failed') {
      setError(t('recovery.fileReadFailed'))
      return
    }
    const decoded = decodeVaultDocument(read.raw)
    setCandidate(
      decoded.kind === 'valid'
        ? { kind: 'valid', fileName: read.fileName, raw: read.raw }
        : {
            kind: 'invalid',
            fileName: read.fileName,
            issues: decoded.issues,
            truncated: decoded.truncated,
          },
    )
  }

  function repair() {
    if (candidate?.kind !== 'valid') return
    setError('')
    try {
      const result = recovery.repair(candidate.raw)
      if (result.kind === 'invalid') {
        setCandidate({ fileName: candidate.fileName, ...result })
        return
      }
      finish(result)
    } catch {
      setError(t('recovery.writeFailed'))
    }
  }

  function reset() {
    if (!resetArmed) {
      armed.arm('vault-reset')
      return
    }
    downloadOriginal(recovery.raw)
    setError('')
    try {
      finish(recovery.reset())
    } catch {
      armed.cancel()
      setError(t('recovery.writeFailed'))
    }
  }

  return (
    <main className="mx-auto max-w-6xl space-y-5">
      <header>
        <p className="text-destructive mb-2 text-[11px] font-medium tracking-[0.18em] uppercase">
          {t('recovery.eyebrow')}
        </p>
        <h1 className="text-3xl font-semibold tracking-tight">{t('recovery.title')}</h1>
        <p className="text-muted-foreground mt-2 max-w-3xl text-sm leading-relaxed">
          {t('recovery.description')}
        </p>
      </header>

      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_19rem]">
        <RecoverySummaryCard
          recovery={recovery}
          originalSize={formatBytes(recovery.raw)}
          candidate={candidate}
          error={error}
          resetArmed={resetArmed}
          resetProgress={armed.progress}
          onDownload={() => downloadOriginal(recovery.raw)}
          onFileChange={(file) => void readRepairFile(file)}
          onRepair={repair}
          onReset={reset}
        />
        <RecoverySequence />
      </div>
    </main>
  )
}

function downloadOriginal(raw: string) {
  const url = URL.createObjectURL(new Blob([raw], { type: 'application/json' }))
  const link = document.createElement('a')
  link.href = url
  link.download = 'qr-vault-recovery-original.json'
  document.body.append(link)
  link.click()
  link.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 0)
}

function formatBytes(raw: string): string {
  const bytes = new TextEncoder().encode(raw).byteLength
  return bytes < 1024 ? `${bytes} B` : `${(bytes / 1024).toFixed(1)} KB`
}
