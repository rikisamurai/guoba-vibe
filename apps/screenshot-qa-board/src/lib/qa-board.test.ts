import { describe, expect, it } from 'vitest'

import {
  buildReviewChecklist,
  createQaCard,
  parseQaCards,
  summarizeBoard,
  transitionCardStatus,
} from './qa-board'

describe('summarizeBoard', () => {
  it('counts open screenshot issues and high severity blockers', () => {
    const summary = summarizeBoard([
      { id: 'hero-overlap', title: 'Hero overlap', status: 'open', severity: 'high' },
      { id: 'button-wrap', title: 'Button wrap', status: 'fixed', severity: 'medium' },
      { id: 'mobile-crop', title: 'Mobile crop', status: 'open', severity: 'low' },
    ])

    expect(summary).toEqual({
      total: 3,
      open: 2,
      fixed: 1,
      accepted: 0,
      highSeverityOpen: 1,
    })
  })

  it('moves a screenshot card to fixed without mutating the original board', () => {
    const cards = [
      {
        id: 'hero-overlap',
        title: 'Hero overlap',
        status: 'open' as const,
        severity: 'high' as const,
      },
    ]

    const next = transitionCardStatus(cards, 'hero-overlap', 'fixed')

    expect(next[0].status).toBe('fixed')
    expect(cards[0].status).toBe('open')
  })

  it('creates screenshot review cards with stable ids and review metadata', () => {
    expect(createQaCard('Header action overlaps title', 'high', '/pricing', '375 x 812')).toEqual({
      id: 'header-action-overlaps-title',
      title: 'Header action overlaps title',
      status: 'open',
      severity: 'high',
      route: '/pricing',
      viewport: '375 x 812',
      note: '',
      beforeImage: '',
      afterImage: '',
    })
  })

  it('exports review checklist grouped by current card state', () => {
    const checklist = buildReviewChecklist([
      { id: 'a', title: 'Overlap', status: 'open', severity: 'high' },
      { id: 'b', title: 'Contrast', status: 'accepted', severity: 'low' },
    ])

    expect(checklist).toContain('- [ ] high / Overlap')
    expect(checklist).toContain('- [x] low / Contrast')
  })

  it('parses persisted QA cards and rejects malformed payloads', () => {
    const payload = JSON.stringify([
      { id: 'a', title: 'Overlap', status: 'open', severity: 'high' },
    ])

    expect(parseQaCards(payload)).toEqual([
      { id: 'a', title: 'Overlap', status: 'open', severity: 'high' },
    ])
    expect(parseQaCards('{"bad":true}')).toBeNull()
  })
})
