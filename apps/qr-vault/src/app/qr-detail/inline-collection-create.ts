import { useCallback, type Dispatch, type SetStateAction } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { nanoid8 } from '@/lib/ids'
import { upsertCollection, type Collection, type VaultData } from '@/lib/storage'

export type CreateCollectionResult = 'created' | 'selected-existing'

export type InlineCollectionTitleResult =
  | { kind: 'empty'; title: '' }
  | { kind: 'existing'; title: string; collection: Collection }
  | { kind: 'new'; title: string }

type InlineCollectionCreateParams = {
  collections: Collection[]
  setCollectionIds: Dispatch<SetStateAction<string[]>>
  updateVault: (updater: (current: VaultData) => VaultData) => void
}

export function resolveInlineCollectionTitle(
  collections: Collection[],
  rawTitle: string,
): InlineCollectionTitleResult {
  const title = rawTitle.trim()
  if (!title) return { kind: 'empty', title: '' }
  const collection = collections.find((item) => item.title === title)
  if (collection) return { kind: 'existing', title, collection }
  return { kind: 'new', title }
}

export function useInlineCollectionCreate({
  collections,
  setCollectionIds,
  updateVault,
}: InlineCollectionCreateParams) {
  const { t } = useTranslation()

  return useCallback(
    (rawTitle: string): CreateCollectionResult => {
      const result = resolveInlineCollectionTitle(collections, rawTitle)
      if (result.kind === 'empty') return 'selected-existing'

      const collectionId = result.kind === 'existing' ? result.collection.id : nanoid8()
      if (result.kind === 'new') {
        updateVault((current) =>
          upsertCollection(current, { id: collectionId, title: result.title }),
        )
      }

      setCollectionIds((ids) => (ids.includes(collectionId) ? ids : [...ids, collectionId]))
      toast.success(
        t(
          result.kind === 'existing'
            ? 'collectionPicker.existingSelected'
            : 'collectionPicker.createdAndSelected',
        ),
      )

      return result.kind === 'existing' ? 'selected-existing' : 'created'
    },
    [collections, setCollectionIds, t, updateVault],
  )
}
