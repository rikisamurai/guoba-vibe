'use client'

import type { VariantProps } from 'class-variance-authority'
import { useState } from 'react'
import { toast } from 'sonner'

import { Button, buttonVariants } from '@/components/shadcn-ui/button'

type ButtonVariant = VariantProps<typeof buttonVariants>['variant']
type ButtonSize = VariantProps<typeof buttonVariants>['size']

export function CopyButton({
  value,
  label,
  variant = 'outline',
  size = 'sm',
  className,
}: {
  value: string
  label?: string
  variant?: ButtonVariant
  size?: ButtonSize
  className?: string
}) {
  const [copied, setCopied] = useState(false)
  return (
    <Button
      variant={variant}
      size={size}
      className={className}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value)
          setCopied(true)
          toast.success('Copied')
          setTimeout(() => setCopied(false), 1500)
        } catch {
          toast.error('Copy failed')
        }
      }}
    >
      {copied ? 'Copied' : (label ?? 'Copy')}
    </Button>
  )
}
