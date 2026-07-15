import { useCallback, type Dispatch, type SetStateAction } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import type { VaultHandle } from '@/app/vault/vault-types'

export type CreateCollectionResult = 'created' | 'selected-existing'

type InlineCollectionCreateParams = {
  collection: VaultHandle['collection']
  setCollectionIds: Dispatch<SetStateAction<string[]>>
}

export function useInlineCollectionCreate({
  collection,
  setCollectionIds,
}: InlineCollectionCreateParams) {
  const { t } = useTranslation()

  return useCallback(
    (rawTitle: string): CreateCollectionResult => {
      const result = collection.selectOrCreate(rawTitle)
      if (result.kind === 'empty') return 'selected-existing'

      setCollectionIds((ids) => (ids.includes(result.id) ? ids : [...ids, result.id]))
      toast.success(
        t(
          result.kind === 'existing'
            ? 'collectionPicker.existingSelected'
            : 'collectionPicker.createdAndSelected',
        ),
      )

      return result.kind === 'existing' ? 'selected-existing' : 'created'
    },
    [collection, setCollectionIds, t],
  )
}
