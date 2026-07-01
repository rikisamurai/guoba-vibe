export type RubricCriterion = {
  id: string
  label: string
  description?: string
  weight: number
}

export type EvalAttempt = {
  id: string
  title: string
  ratings: Record<string, number>
}

export type EvalSuiteAttempt = EvalAttempt & {
  brief: string
  output: string
  evidence: Record<string, string>
}

export type EvalSuite = {
  id: string
  title: string
  description: string
  task: {
    prompt: string
    expectedOutcome: string[]
  }
  rubric: RubricCriterion[]
  attempts: EvalSuiteAttempt[]
}

export type AttemptScore = {
  id: string
  title: string
  score: number
  band: 'ship' | 'inspect' | 'hold'
}

export function scoreAttempt(rubric: RubricCriterion[], attempt: EvalAttempt): AttemptScore {
  const totalWeight = rubric.reduce((sum, criterion) => sum + criterion.weight, 0)
  const weightedScore = rubric.reduce((sum, criterion) => {
    const rating = attempt.ratings[criterion.id] ?? 0
    return sum + (rating / 5) * criterion.weight
  }, 0)
  const score = totalWeight === 0 ? 0 : Math.round((weightedScore / totalWeight) * 100)

  return {
    id: attempt.id,
    title: attempt.title,
    score,
    band: score >= 85 ? 'ship' : score >= 70 ? 'inspect' : 'hold',
  }
}

export function scoreAttempts(rubric: RubricCriterion[], attempts: EvalAttempt[]): AttemptScore[] {
  return attempts
    .map((attempt) => scoreAttempt(rubric, attempt))
    .sort((left, right) => right.score - left.score)
}

export function updateCriterionWeight(
  rubric: RubricCriterion[],
  id: string,
  weight: number,
): RubricCriterion[] {
  return rubric.map((criterion) => (criterion.id === id ? { ...criterion, weight } : criterion))
}

export function normalizeRubricWeights(rubric: RubricCriterion[]): RubricCriterion[] {
  const total = rubric.reduce((sum, criterion) => sum + criterion.weight, 0)

  if (total === 0) {
    return rubric
  }

  return rubric.map((criterion) => ({
    ...criterion,
    weight: Math.round((criterion.weight / total) * 100) / 100,
  }))
}

export function validateEvalSuite(
  suite: EvalSuite,
): { ok: true; errors: [] } | { ok: false; errors: string[] } {
  const errors: string[] = []

  if (!suite.rubric.length) {
    errors.push('Suite must include at least one rubric criterion.')
  }

  if (!suite.attempts.length) {
    errors.push('Suite must include at least one attempt.')
  }

  for (const attempt of suite.attempts) {
    for (const criterion of suite.rubric) {
      if (typeof attempt.ratings[criterion.id] !== 'number') {
        errors.push(`${attempt.title} is missing rating for ${criterion.label}.`)
      }

      if (!attempt.evidence[criterion.id]) {
        errors.push(`${attempt.title} is missing evidence for ${criterion.label}.`)
      }
    }
  }

  return errors.length ? { ok: false, errors } : { ok: true, errors: [] }
}
