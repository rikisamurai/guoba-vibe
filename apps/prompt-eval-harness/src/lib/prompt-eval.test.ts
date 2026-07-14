import { describe, expect, it } from 'vitest'

import { parseEvalSuite, validateEvalSuite } from './eval-validation'
import {
  normalizeRubricWeights,
  scoreAttempt,
  scoreAttempts,
  updateCriterionWeight,
  type EvalSuite,
} from './prompt-eval'

const validSuite: EvalSuite = {
  id: 'suite',
  title: 'Regression suite',
  description: 'Checks candidate attempts',
  task: { prompt: 'Fix the bug', expectedOutcome: ['The regression stays fixed.'] },
  rubric: [{ id: 'correctness', label: 'Correctness', weight: 1 }],
  attempts: [
    {
      id: 'a',
      title: 'Attempt A',
      brief: 'Focused fix',
      output: 'Patch',
      ratings: { correctness: 5 },
      evidence: { correctness: 'Focused regression passes.' },
    },
  ],
}

describe('scoring', () => {
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

  it('defensively clamps invalid direct ratings so a score cannot exceed 100', () => {
    expect(
      scoreAttempt([{ id: 'quality', label: 'Quality', weight: 1 }], {
        id: 'bad',
        title: 'Invalid input',
        ratings: { quality: 99 },
      }).score,
    ).toBe(100)
  })

  it('updates one weight without mutating the source rubric', () => {
    const rubric = [
      { id: 'correctness', label: 'Correctness', weight: 0.5 },
      { id: 'verification', label: 'Verification', weight: 0.5 },
    ]

    expect(updateCriterionWeight(rubric, 'verification', 0.25)[1].weight).toBe(0.25)
    expect(rubric[1].weight).toBe(0.5)
  })

  it('ranks equal scores deterministically by title', () => {
    const rubric = [{ id: 'correctness', label: 'Correctness', weight: 1 }]
    expect(
      scoreAttempts(rubric, [
        { id: 'b', title: 'Beta', ratings: { correctness: 5 } },
        { id: 'a', title: 'Alpha', ratings: { correctness: 5 } },
      ]).map((item) => item.id),
    ).toEqual(['a', 'b'])
  })

  it('normalizes displayed weights to exactly 100 percent', () => {
    const normalized = normalizeRubricWeights([
      { id: 'a', label: 'A', weight: 1 },
      { id: 'b', label: 'B', weight: 1 },
      { id: 'c', label: 'C', weight: 1 },
    ])

    expect(normalized.map((item) => item.weight)).toEqual([0.34, 0.33, 0.33])
    expect(normalized.reduce((sum, item) => sum + item.weight, 0)).toBe(1)
  })
})

describe('suite validation', () => {
  it('accepts a complete suite and parses it from JSON', () => {
    expect(validateEvalSuite(validSuite)).toEqual({ ok: true, errors: [] })
    expect(parseEvalSuite(JSON.stringify(validSuite))).toEqual({
      ok: true,
      errors: [],
      suite: validSuite,
    })
  })

  it('rejects out-of-range and non-finite ratings', () => {
    const invalid = structuredClone(validSuite)
    invalid.attempts[0].ratings.correctness = 99

    expect(validateEvalSuite(invalid)).toEqual({
      ok: false,
      errors: ['Attempt A rating for Correctness must be a finite number from 1 to 5.'],
    })

    invalid.attempts[0].ratings.correctness = Number.NaN
    expect(validateEvalSuite(invalid).ok).toBe(false)
  })

  it('rejects empty attempts, duplicate IDs, unknown criteria, and incomplete weights', () => {
    expect(validateEvalSuite({ ...validSuite, attempts: [] }).errors).toContain(
      'Suite must include at least one attempt.',
    )

    const duplicate = structuredClone(validSuite)
    duplicate.rubric.push({ id: 'correctness', label: 'Duplicate', weight: 0 })
    expect(validateEvalSuite(duplicate).errors).toContain('Rubric criterion ids must be unique.')

    const unknown = structuredClone(validSuite)
    unknown.attempts[0].ratings.extra = 3
    expect(validateEvalSuite(unknown).errors).toContain(
      'Attempt A has ratings for unknown criteria: extra.',
    )

    const wrongTotal = structuredClone(validSuite)
    wrongTotal.rubric[0].weight = 0.9
    expect(validateEvalSuite(wrongTotal).errors).toContain(
      'Rubric weights must total 100% (currently 90%).',
    )
  })

  it('rejects malformed JSON without throwing', () => {
    expect(parseEvalSuite('{')).toEqual({ ok: false, errors: ['Suite must be valid JSON.'] })
  })
})
