import { describe, expect, it } from 'vitest'

import { scoreAttempt, updateCriterionWeight } from './prompt-eval'

describe('scoreAttempt', () => {
  it('normalizes weighted rubric ratings to a 100 point score', () => {
    const score = scoreAttempt(
      [
        { id: 'correctness', label: 'Correctness', weight: 0.5 },
        { id: 'verification', label: 'Verification', weight: 0.3 },
        { id: 'scope', label: 'Scope control', weight: 0.2 },
      ],
      {
        id: 'a1',
        title: 'Agent A',
        ratings: { correctness: 5, verification: 4, scope: 3 },
      },
    )

    expect(score).toEqual({ id: 'a1', title: 'Agent A', score: 86, band: 'ship' })
  })

  it('updates one rubric weight while preserving the other criteria', () => {
    const rubric = [
      { id: 'correctness', label: 'Correctness', weight: 0.5 },
      { id: 'verification', label: 'Verification', weight: 0.3 },
    ]

    expect(updateCriterionWeight(rubric, 'verification', 0.45)).toEqual([
      { id: 'correctness', label: 'Correctness', weight: 0.5 },
      { id: 'verification', label: 'Verification', weight: 0.45 },
    ])
  })
})
