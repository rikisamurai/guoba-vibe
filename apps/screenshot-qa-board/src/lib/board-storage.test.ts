import { describe, expect, it, vi } from 'vitest'

import {
  boardBackupStorageKey,
  boardStorageKey,
  loadBoard,
  maxBoardBytes,
  replaceBoardWithBackup,
  saveBoard,
} from './board-storage'
import type { QaCard } from './qa-board'

const savedCard: QaCard = {
  id: 'a',
  title: 'Overlap',
  status: 'open',
  severity: 'high',
  route: '/pricing',
  viewport: '375 x 812',
  browser: 'Chrome',
  os: 'macOS',
  capturedAt: '2026-07-14T03:18:00.000Z',
  note: '',
  beforeImage: '',
  afterImage: '',
}

describe('board storage', () => {
  it('loads a valid board and reports malformed local data', () => {
    expect(
      loadBoard({ getItem: () => JSON.stringify([savedCard]), setItem: vi.fn() }).cards,
    ).toEqual([savedCard])
    const invalid = loadBoard({
      getItem: (key) => (key === boardStorageKey ? '{bad' : null),
      setItem: vi.fn(),
    })
    expect(invalid.error).toContain('invalid')
    expect(invalid.recoveryRaw).toBe('{bad')
  })

  it('surfaces browser storage failures instead of reporting success', () => {
    const result = saveBoard(
      {
        getItem: vi.fn(),
        setItem: () => {
          throw new Error('quota')
        },
      },
      [savedCard],
    )
    expect(result).toEqual({
      ok: false,
      error: 'The browser could not save this board. Storage may be full or unavailable.',
    })
  })

  it('blocks boards above the explicit persistence budget', () => {
    const oversized = { ...savedCard, note: 'x'.repeat(maxBoardBytes) }
    const storage = { getItem: vi.fn(), setItem: vi.fn() }
    expect(saveBoard(storage, [oversized]).ok).toBe(false)
    expect(storage.setItem).not.toHaveBeenCalled()
  })

  it('uses the versioned storage key', () => {
    const storage = { getItem: vi.fn(() => null), setItem: vi.fn() }
    saveBoard(storage, [savedCard])
    expect(storage.setItem).toHaveBeenCalledWith(boardStorageKey, JSON.stringify([savedCard]))
  })

  it('backs up the current payload before replacing the board', () => {
    const previous = JSON.stringify([savedCard])
    const setItem = vi.fn()
    const result = replaceBoardWithBackup(
      {
        getItem: (key) => (key === boardStorageKey ? previous : null),
        setItem,
      },
      [],
    )

    expect(result).toEqual({ ok: true, backupRaw: previous })
    expect(setItem.mock.calls).toEqual([
      [boardBackupStorageKey, previous],
      [boardStorageKey, '[]'],
    ])
  })

  it('does not overwrite the board when the recovery backup fails', () => {
    const setItem = vi.fn(() => {
      throw new Error('quota')
    })
    const result = replaceBoardWithBackup(
      { getItem: () => JSON.stringify([savedCard]), setItem },
      [],
    )

    expect(result.ok).toBe(false)
    expect(setItem).toHaveBeenCalledTimes(1)
    expect(setItem).toHaveBeenCalledWith(boardBackupStorageKey, JSON.stringify([savedCard]))
  })
})
