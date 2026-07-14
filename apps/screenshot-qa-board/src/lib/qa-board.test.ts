import { describe, expect, it } from 'vitest'

import {
  buildReviewChecklist,
  createQaCard,
  exportQaBoard,
  isPersistableImageSource,
  parseQaBoard,
  parseStoredQaCards,
  summarizeBoard,
  transitionCardStatus,
  type QaCard,
  type QaCardDraft,
} from './qa-board'

const draft: QaCardDraft = {
  title: 'Header action overlaps title',
  severity: 'high',
  route: '/pricing',
  viewport: '375 x 812',
  browser: 'Chrome 126',
  os: 'macOS 15',
  capturedAt: '2026-07-14T03:18:00.000Z',
  note: 'CTA touches the title.',
  beforeImage: 'https://images.example/before.png',
  afterImage: '',
}

function card(overrides: Partial<QaCard> = {}): QaCard {
  return { id: 'issue-a', status: 'open', ...draft, ...overrides }
}

describe('QA board domain', () => {
  it('counts issue states and high severity blockers', () => {
    const summary = summarizeBoard([
      card(),
      card({ id: 'issue-b', status: 'fixed', severity: 'medium' }),
      card({ id: 'issue-c', status: 'open', severity: 'low' }),
    ])
    expect(summary).toEqual({ total: 3, open: 2, fixed: 1, accepted: 0, highSeverityOpen: 1 })
  })

  it('moves an issue without mutating the original board', () => {
    const cards = [card()]
    const next = transitionCardStatus(cards, 'issue-a', 'fixed')
    expect(next[0].status).toBe('fixed')
    expect(cards[0].status).toBe('open')
  })

  it('uses opaque unique ids so duplicate and non-ASCII titles keep history', () => {
    const first = createQaCard({ ...draft, title: '截图重叠' })
    const second = createQaCard({ ...draft, title: '截图重叠' })
    expect(first.id).not.toBe('')
    expect(first.id).not.toBe(second.id)
    expect(first.title).toBe(second.title)
  })

  it('exports and strictly imports a versioned full board', () => {
    const cards = [card()]
    expect(parseQaBoard(exportQaBoard(cards))).toEqual({ ok: true, cards })
    expect(parseQaBoard(JSON.stringify(cards))).toEqual({
      ok: false,
      error: 'The board file must be a JSON object.',
    })
    expect(parseQaBoard('{"schemaVersion":1,"cards":[]}')).toEqual({
      ok: false,
      error: 'Unsupported board file. Expected schemaVersion 2.',
    })
  })

  it('rejects duplicate ids and malformed capture metadata', () => {
    const duplicate = JSON.stringify({ schemaVersion: 2, cards: [card(), card()] })
    expect(parseQaBoard(duplicate)).toEqual({ ok: false, error: 'Issue IDs must be unique.' })
    expect(parseStoredQaCards(JSON.stringify([card({ capturedAt: 'tomorrow' })]))).toBeNull()
  })

  it('accepts durable image locations and rejects unsafe or transient URLs', () => {
    expect(isPersistableImageSource('https://images.example/shot.png')).toBe(true)
    expect(isPersistableImageSource('/screenshots/shot.png')).toBe(true)
    expect(isPersistableImageSource('data:image/png;base64,AA==')).toBe(true)
    expect(isPersistableImageSource('blob:https://app.example/transient')).toBe(false)
    expect(isPersistableImageSource('javascript:alert(1)')).toBe(false)
  })

  it('builds a portable review checklist', () => {
    const checklist = buildReviewChecklist([
      card(),
      card({ id: 'b', title: 'Contrast', status: 'accepted', severity: 'low' }),
    ])
    expect(checklist).toContain('- [ ] high / Header action overlaps title')
    expect(checklist).toContain('- [x] low / Contrast')
  })
})
