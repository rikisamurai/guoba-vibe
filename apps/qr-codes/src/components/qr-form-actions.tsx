import { Button } from '@/components/shadcn-ui/button'

type QrFormActionsProps = {
  pending: boolean
  secondaryPending: boolean
  submitLabel: string
  secondarySubmitLabel?: string
  className?: string
  onSecondarySubmit?: () => void
}

export function QrFormActions({
  pending,
  secondaryPending,
  submitLabel,
  secondarySubmitLabel,
  className = '',
  onSecondarySubmit,
}: QrFormActionsProps) {
  return (
    <div className={`flex flex-wrap gap-2 ${className}`}>
      <Button type="submit" disabled={pending || secondaryPending}>
        {pending ? 'Saving…' : submitLabel}
      </Button>
      {onSecondarySubmit && secondarySubmitLabel && (
        <Button
          type="button"
          variant="outline"
          disabled={pending || secondaryPending}
          onClick={onSecondarySubmit}
        >
          {secondaryPending ? 'Saving…' : secondarySubmitLabel}
        </Button>
      )}
    </div>
  )
}
