import type { DeleteReceipt, UndoResult } from '@/app/vault/vault-types'

export function createDeleteReceipt<Entity extends 'qr' | 'collection'>(
  entity: Entity,
  id: string,
  restore: () => boolean,
): DeleteReceipt<Entity> {
  return Object.freeze({
    kind: 'deleted' as const,
    entity,
    id,
    undo: repeatSafeUndo(restore),
  })
}

function repeatSafeUndo(restore: () => boolean): () => UndoResult {
  let consumed = false
  return () => {
    if (consumed) return Object.freeze({ kind: 'already-present' })
    const restored = restore()
    consumed = true
    return Object.freeze({ kind: restored ? 'restored' : 'already-present' })
  }
}
