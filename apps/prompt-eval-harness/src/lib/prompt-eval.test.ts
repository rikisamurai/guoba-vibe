import { describe, expect, it } from 'vitest'

import {
  normalizeRubricWeights,
  scoreAttempt,
  scoreAttempts,
  updateCriterionWeight,
  validateEvalSuite,
} from './prompt-eval'

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

  it('ranks attempts by weighted score from strongest to weakest', () => {
    const rubric = [
      { id: 'correctness', label: 'Correctness', weight: 0.6 },
      { id: 'verification', label: 'Verification', weight: 0.4 },
    ]

    expect(
      scoreAttempts(rubric, [
        { id: 'fast', title: 'Fast patch', ratings: { correctness: 3, verification: 2 } },
        { id: 'safe', title: 'Safe patch', ratings: { correctness: 5, verification: 4 } },
      ]),
    ).toEqual([
      { id: 'safe', title: 'Safe patch', score: 92, band: 'ship' },
      { id: 'fast', title: 'Fast patch', score: 52, band: 'hold' },
    ])
  })

  it('normalizes rubric weights for portable suite files', () => {
    expect(
      normalizeRubricWeights([
        { id: 'correctness', label: 'Correctness', weight: 2 },
        { id: 'verification', label: 'Verification', weight: 1 },
      ]),
    ).toEqual([
      { id: 'correctness', label: 'Correctness', weight: 0.67 },
      { id: 'verification', label: 'Verification', weight: 0.33 },
    ])
  })

  it('validates that every attempt has ratings and evidence for every criterion', () => {
    expect(
      validateEvalSuite({
        id: 'suite',
        title: 'Suite',
        description: 'Checks attempts',
        task: { prompt: 'Fix the bug', expectedOutcome: ['works'] },
        rubric: [{ id: 'correctness', label: 'Correctness', weight: 1 }],
        attempts: [
          {
            id: 'a',
            title: 'Attempt A',
            brief: 'Missing evidence',
            output: 'Patch',
            ratings: {},
            evidence: {},
          },
        ],
      }),
    ).toEqual({
      ok: false,
      errors: [
        'Attempt A is missing rating for Correctness.',
        'Attempt A is missing evidence for Correctness.',
      ],
    })
  })
})
