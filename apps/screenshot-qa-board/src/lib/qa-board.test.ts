import { describe, expect, it } from 'vitest'

import { summarizeBoard, transitionCardStatus } from './qa-board'

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
})
