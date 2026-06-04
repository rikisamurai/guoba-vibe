import { Check, Copy } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'

type CopyButtonProps = {
  value: string
  label?: string
}

export function CopyButton({ value, label }: CopyButtonProps) {
  const [isCopied, setIsCopied] = useState(false)
  const { t } = useTranslation()

  async function copyValue() {
    await navigator.clipboard.writeText(value)
    setIsCopied(true)
    window.setTimeout(() => setIsCopied(false), 1200)
  }

  return (
    <Button variant="outline" size="sm" type="button" onClick={copyValue} disabled={!value}>
      {isCopied ? <Check /> : <Copy />}
      <span>{isCopied ? t('common.copied') : (label ?? t('common.copy'))}</span>
    </Button>
  )
}
