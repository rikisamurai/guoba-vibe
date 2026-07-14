import { describe, expect, it, vi } from 'vitest'

import { boardStorageKey, loadBoard, maxBoardBytes, saveBoard } from './board-storage'
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
    expect(loadBoard({ getItem: () => '{bad', setItem: vi.fn() }).error).toContain('invalid')
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
})
