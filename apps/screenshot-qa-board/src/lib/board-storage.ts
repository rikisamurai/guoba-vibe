import { parseStoredQaCards, type QaCard } from './qa-board'

export const boardStorageKey = 'screenshot-qa-board-cards-v2'
export const boardBackupStorageKey = 'screenshot-qa-board-cards-v2-backup'
export const maxBoardBytes = 4 * 1024 * 1024

type StorageAdapter = Pick<Storage, 'getItem' | 'setItem'>

export type LoadResult = {
  cards: QaCard[] | null
  error: string
  recoveryRaw: string | null
  backupRaw: string | null
}
export type SaveResult = { ok: true } | { ok: false; error: string }
export type ReplaceResult = { ok: true; backupRaw: string | null } | { ok: false; error: string }

export function loadBoard(storage: StorageAdapter): LoadResult {
  try {
    const backupRaw = storage.getItem(boardBackupStorageKey)
    const stored = storage.getItem(boardStorageKey)
    if (stored === null) return { cards: null, error: '', recoveryRaw: null, backupRaw }
    const cards = parseStoredQaCards(stored)
    return cards
      ? { cards, error: '', recoveryRaw: null, backupRaw }
      : {
          cards: null,
          error:
            'Saved board data is invalid. Writes are blocked until you export recovery data, import a board, or reset.',
          recoveryRaw: stored,
          backupRaw,
        }
  } catch {
    return {
      cards: null,
      error: 'Local storage is unavailable; changes cannot be persisted.',
      recoveryRaw: null,
      backupRaw: null,
    }
  }
}

export function saveBoard(storage: StorageAdapter, cards: QaCard[]): SaveResult {
  const serialized = serializeBoard(cards)
  if (!serialized.ok) return serialized
  try {
    storage.setItem(boardStorageKey, serialized.payload)
    return { ok: true }
  } catch {
    return {
      ok: false,
      error: 'The browser could not save this board. Storage may be full or unavailable.',
    }
  }
}

export function replaceBoardWithBackup(storage: StorageAdapter, cards: QaCard[]): ReplaceResult {
  const serialized = serializeBoard(cards)
  if (!serialized.ok) return serialized
  try {
    const backupRaw = storage.getItem(boardStorageKey)
    if (backupRaw !== null) storage.setItem(boardBackupStorageKey, backupRaw)
    storage.setItem(boardStorageKey, serialized.payload)
    return { ok: true, backupRaw }
  } catch {
    return {
      ok: false,
      error: 'The browser could not create a recovery backup, so the board was not replaced.',
    }
  }
}

function serializeBoard(cards: QaCard[]) {
  const payload = JSON.stringify(cards)
  if (new TextEncoder().encode(payload).byteLength > maxBoardBytes) {
    return {
      ok: false as const,
      error: 'Board is larger than 4MB. Remove or link screenshots instead of embedding them.',
    }
  }
  return { ok: true as const, payload }
}
