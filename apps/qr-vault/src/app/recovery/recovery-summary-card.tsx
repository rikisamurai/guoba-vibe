import { AlertCircle, Download, FileCheck2, FileUp, RotateCcw } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import type { RepairCandidate } from '@/app/recovery/recovery-types'
import { ValidationIssues } from '@/app/vault/validation-issues'
import type { RecoveringVault } from '@/app/vault/vault-open'
import { VAULT_STORAGE_KEY } from '@/app/vault/vault-storage'
import { Button } from '@/components/shadcn-ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/shadcn-ui/card'

type RecoverySummaryCardProps = Readonly<{
  recovery: RecoveringVault
  originalSize: string
  candidate: RepairCandidate | null
  error: string
  resetArmed: boolean
  resetProgress: number
  onDownload: () => void
  onFileChange: (file: File | undefined) => void
  onRepair: () => void
  onReset: () => void
}>

export function RecoverySummaryCard(props: RecoverySummaryCardProps) {
  const { t } = useTranslation()
  const candidateValid = props.candidate?.kind === 'valid'

  return (
    <Card>
      <CardHeader className="border-b" role="alert">
        <div className="flex items-start gap-3">
          <span className="border-destructive/30 bg-destructive/10 text-destructive flex size-10 shrink-0 items-center justify-center rounded-md border">
            <AlertCircle className="size-5" />
          </span>
          <div>
            <CardTitle>{t('recovery.validationTitle')}</CardTitle>
            <CardDescription className="mt-1">{t('recovery.untouched')}</CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-5">
        <dl className="bg-muted/30 divide-border grid divide-y rounded-md border px-3 font-mono text-xs">
          <MetadataRow label={t('recovery.storageKey')} value={VAULT_STORAGE_KEY} />
          <MetadataRow label={t('recovery.originalSize')} value={props.originalSize} />
        </dl>

        <ValidationIssues issues={props.recovery.issues} truncated={props.recovery.truncated} />

        <Button type="button" onClick={props.onDownload}>
          <Download /> {t('recovery.downloadOriginal')}
        </Button>

        <section className="space-y-3 border-t pt-5">
          <div>
            <h2 className="font-medium">{t('recovery.repairTitle')}</h2>
            <p className="text-muted-foreground mt-1 text-xs leading-relaxed">
              {t('recovery.repairDescription')}
            </p>
          </div>
          <label className="bg-background/65 hover:border-ring/60 focus-within:border-ring focus-within:ring-ring/50 relative flex cursor-pointer items-center gap-3 rounded-md border border-dashed px-3 py-3 transition-colors focus-within:ring-[3px]">
            <FileUp className="text-muted-foreground size-4" />
            <span className="min-w-0 text-sm">
              {props.candidate?.fileName || t('recovery.chooseFile')}
            </span>
            <input
              type="file"
              accept="application/json,.json"
              aria-label={t('recovery.chooseFile')}
              className="absolute inset-0 size-full cursor-pointer opacity-0"
              onChange={(event) => props.onFileChange(event.target.files?.[0])}
            />
          </label>

          {candidateValid && (
            <div
              role="status"
              aria-live="polite"
              className="bg-muted/50 flex items-center gap-2 rounded-md border px-3 py-2 text-xs"
            >
              <FileCheck2 className="size-3.5" /> {t('recovery.validFile')}
            </div>
          )}
          {props.candidate?.kind === 'invalid' && (
            <div
              role="alert"
              aria-live="assertive"
              className="border-destructive/30 bg-destructive/10 rounded-md border p-3"
            >
              <p className="text-destructive mb-3 text-xs">{t('recovery.invalidFile')}</p>
              <ValidationIssues
                issues={props.candidate.issues}
                truncated={props.candidate.truncated}
              />
            </div>
          )}
          {props.error && (
            <p
              role="alert"
              aria-live="assertive"
              className="border-destructive/30 bg-destructive/10 text-destructive rounded-md border px-3 py-2 text-xs"
            >
              {props.error}
            </p>
          )}
          <Button
            type="button"
            variant="outline"
            disabled={!candidateValid}
            onClick={props.onRepair}
          >
            <FileCheck2 /> {t('recovery.useFile')}
          </Button>
        </section>

        <section className="space-y-3 border-t pt-5">
          <div>
            <h2 className="font-medium">{t('recovery.resetTitle')}</h2>
            <p className="text-muted-foreground mt-1 text-xs leading-relaxed">
              {t('recovery.resetDescription')}
            </p>
          </div>
          <Button
            type="button"
            variant={props.resetArmed ? 'destructive' : 'outline'}
            className="relative overflow-hidden"
            data-armed-for="vault-reset"
            onClick={props.onReset}
            aria-label={props.resetArmed ? t('recovery.confirmReset') : t('recovery.armReset')}
          >
            <RotateCcw className="relative z-10" />
            <span className="relative z-10">
              {props.resetArmed ? t('recovery.confirmReset') : t('recovery.armReset')}
            </span>
            {props.resetArmed && (
              <span
                aria-hidden
                className="bg-destructive absolute bottom-0 left-0 h-1"
                style={{ width: `${props.resetProgress * 100}%` }}
              />
            )}
          </Button>
        </section>
      </CardContent>
    </Card>
  )
}

function MetadataRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[8rem_1fr] gap-3 py-3">
      <dt className="text-muted-foreground uppercase">{label}</dt>
      <dd className="break-all">{value}</dd>
    </div>
  )
}
