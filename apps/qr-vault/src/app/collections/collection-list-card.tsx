import { Link } from '@tanstack/react-router'
import { FolderOpen, Plus } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { Badge } from '@/components/shadcn-ui/badge'
import { Button } from '@/components/shadcn-ui/button'
import { Card, CardAction, CardContent, CardHeader, CardTitle } from '@/components/shadcn-ui/card'
import type { VaultData } from '@/lib/storage'
import { cn } from '@/lib/utils'

type CollectionListCardProps = {
  collections: VaultData['collections']
  collectionCounts: Record<string, number>
  activeId: string
  onNewCollection: () => void
}

export function CollectionListCard({
  collections,
  collectionCounts,
  activeId,
  onNewCollection,
}: CollectionListCardProps) {
  const { t } = useTranslation()

  return (
    <Card>
      <CardHeader className="border-b">
        <CardTitle>{t('collections.allFolders')}</CardTitle>
        <CardAction className="flex items-center gap-2">
          <Badge variant="outline">{collections.length}</Badge>
          <Button type="button" size="sm" onClick={onNewCollection}>
            <Plus /> {t('collections.newCollection')}
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent className="pt-4">
        {collections.length ? (
          <div className="flex flex-wrap gap-2 overflow-visible">
            {collections.map((collection) => (
              <Link
                key={collection.id}
                to="/collections/$collectionId"
                params={{ collectionId: collection.id }}
                className={cn(
                  'group bg-card inline-flex max-w-full items-center gap-2 rounded-md border px-3 py-2 text-sm font-medium transition-colors',
                  collection.id === activeId
                    ? 'border-foreground shadow-[0_0_0_1px_var(--foreground)]'
                    : 'border-border hover:bg-muted/50',
                )}
              >
                <FolderOpen className="size-3.5 shrink-0" />
                <span className="min-w-0 truncate">{collection.title}</span>
                <span className="text-muted-foreground font-mono text-[10px]">
                  {collectionCounts[collection.id] ?? 0}
                </span>
              </Link>
            ))}
          </div>
        ) : (
          <p className="text-muted-foreground rounded-md border border-dashed px-3 py-4 text-center text-xs italic">
            {t('collections.noCollections')}
          </p>
        )}
      </CardContent>
    </Card>
  )
}
