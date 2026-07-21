import { useTranslation } from 'react-i18next'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/shadcn-ui/card'

export function RecoverySequence() {
  const { t } = useTranslation()
  const steps = [
    ['recovery.sequenceKeepTitle', 'recovery.sequenceKeepDescription'],
    ['recovery.sequenceRepairTitle', 'recovery.sequenceRepairDescription'],
    ['recovery.sequenceResumeTitle', 'recovery.sequenceResumeDescription'],
  ] as const

  return (
    <Card className="lg:sticky lg:top-0">
      <CardHeader className="border-b">
        <CardTitle className="text-muted-foreground text-[11px] tracking-[0.18em] uppercase">
          {t('recovery.sequenceTitle')}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ol className="space-y-5">
          {steps.map(([titleKey, descriptionKey], index) => (
            <li key={titleKey} className="grid grid-cols-[1.75rem_1fr] gap-3">
              <span
                className={
                  index === 0
                    ? 'bg-foreground text-background flex size-7 items-center justify-center rounded-full font-mono text-xs'
                    : 'text-muted-foreground flex size-7 items-center justify-center rounded-full border font-mono text-xs'
                }
              >
                {index + 1}
              </span>
              <div>
                <p className="font-medium">{t(titleKey)}</p>
                <p className="text-muted-foreground mt-0.5 text-xs leading-relaxed">
                  {t(descriptionKey)}
                </p>
              </div>
            </li>
          ))}
        </ol>
      </CardContent>
    </Card>
  )
}
