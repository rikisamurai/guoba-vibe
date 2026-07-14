import { parseStoredQaCards, type QaCard } from './qa-board'

export const boardStorageKey = 'screenshot-qa-board-cards-v2'
export const maxBoardBytes = 4 * 1024 * 1024

type StorageAdapter = Pick<Storage, 'getItem' | 'setItem'>

export type LoadResult = { cards: QaCard[] | null; error: string }
export type SaveResult = { ok: true } | { ok: false; error: string }

export function loadBoard(storage: StorageAdapter): LoadResult {
  try {
    const stored = storage.getItem(boardStorageKey)
    if (!stored) return { cards: null, error: '' }
    const cards = parseStoredQaCards(stored)
    return cards
      ? { cards, error: '' }
      : { cards: null, error: 'Saved board data was invalid, so the demo board was restored.' }
  } catch {
    return { cards: null, error: 'Local storage is unavailable; changes cannot be persisted.' }
  }
}

export function saveBoard(storage: StorageAdapter, cards: QaCard[]): SaveResult {
  const payload = JSON.stringify(cards)
  if (new TextEncoder().encode(payload).byteLength > maxBoardBytes) {
    return {
      ok: false,
      error: 'Board is larger than 4MB. Remove or link screenshots instead of embedding them.',
    }
  }
  try {
    storage.setItem(boardStorageKey, payload)
    return { ok: true }
  } catch {
    return {
      ok: false,
      error: 'The browser could not save this board. Storage may be full or unavailable.',
    }
  }
}
