import { useTranslation } from 'react-i18next'

type CollectionMetaBadgeProps = {
  collectionNames: readonly string[]
  showSeparator: boolean
}

export function CollectionMetaBadge({ collectionNames, showSeparator }: CollectionMetaBadgeProps) {
  const { t } = useTranslation()
  if (!collectionNames.length) return null

  return (
    <>
      {showSeparator && (
        <span className="text-border shrink-0 text-xs leading-none" aria-hidden="true">
          ｜
        </span>
      )}
      <span
        className="bg-muted/45 text-muted-foreground inline-flex max-w-32 shrink-0 items-center gap-1.5 rounded-md border px-1.5 py-0.5 text-[10px] font-medium"
        title={collectionNames.join(', ')}
      >
        <span className="grid shrink-0 grid-cols-2 gap-0.5" aria-hidden="true">
          <span className="bg-muted-foreground/70 size-1 rounded-[1px]" />
          <span className="bg-muted-foreground/35 size-1 rounded-[1px]" />
        </span>
        <span className="truncate">{collectionNames[0]}</span>
        {collectionNames.length > 1 && (
          <span className="font-mono">
            {t('common.moreCount', { count: collectionNames.length - 1 })}
          </span>
        )}
      </span>
    </>
  )
}
