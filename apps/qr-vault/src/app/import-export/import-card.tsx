import { Check, FileUp, Replace } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/shadcn-ui/button'
import { Card, CardAction, CardContent, CardHeader, CardTitle } from '@/components/shadcn-ui/card'
import { cn } from '@/lib/utils'

type ImportCardProps = {
  hasPendingData: boolean
  fileName: string
  message: string
  error: string
  replaceArmed: boolean
  onFileChange: (file: File | undefined) => void
  onMerge: () => void
  onReplace: () => void
}

export function ImportCard({
  hasPendingData,
  fileName,
  message,
  error,
  replaceArmed,
  onFileChange,
  onMerge,
  onReplace,
}: ImportCardProps) {
  const { t } = useTranslation()

  return (
    <Card>
      <CardHeader className="border-b">
        <CardTitle>{t('importExport.importFromFile')}</CardTitle>
        <CardAction>
          <FileUp className="text-muted-foreground size-3.5" />
        </CardAction>
      </CardHeader>
      <CardContent className="space-y-4 pt-4">
        <ImportDropzone
          hasPendingData={hasPendingData}
          fileName={fileName}
          onFileChange={onFileChange}
        />
        <ImportMessage message={message} error={error} />
        <div className="grid grid-cols-2 gap-2">
          <Button type="button" onClick={onMerge} disabled={!hasPendingData}>
            {t('importExport.mergeIntoLocal')}
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={onReplace}
            disabled={!hasPendingData}
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
  )
}

function ImportDropzone({
  hasPendingData,
  fileName,
  onFileChange,
}: Pick<ImportCardProps, 'hasPendingData' | 'fileName' | 'onFileChange'>) {
  const { t } = useTranslation()

  return (
    <label
      className={cn(
        'relative block cursor-pointer rounded-md border-2 border-dashed transition-colors',
        'px-4 py-6 text-center',
        hasPendingData
          ? 'border-foreground/40 bg-muted/50'
          : 'border-border bg-card hover:bg-muted/30',
      )}
    >
      <input
        accept="application/json,.json"
        type="file"
        aria-label={t('importExport.chooseFile')}
        onChange={(event) => onFileChange(event.target.files?.[0])}
        className="absolute inset-0 size-full cursor-pointer opacity-0"
      />
      <FileUp className="text-muted-foreground mx-auto mb-2 size-5" />
      <p className="mb-0.5 text-sm font-medium">{fileName || t('importExport.dropOrChoose')}</p>
      <p className="text-muted-foreground font-mono text-xs">
        {fileName ? t('importExport.clickToReplace') : 'qr-vault-export.json'}
      </p>
    </label>
  )
}

function ImportMessage({ message, error }: Pick<ImportCardProps, 'message' | 'error'>) {
  if (message) {
    return (
      <div className="bg-muted/50 text-foreground flex items-start gap-2 rounded-md border px-3 py-2.5 text-xs">
        <Check className="mt-0.5 size-3.5 shrink-0" />
        <span>{message}</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="border-destructive/30 bg-destructive/10 text-destructive rounded-md border px-3 py-2.5 text-xs">
        {error}
      </div>
    )
  }

  return null
}
