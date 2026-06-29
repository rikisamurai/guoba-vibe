import { describe, expect, it } from 'vitest'

import { summarizeBoard } from './qa-board'

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
})
