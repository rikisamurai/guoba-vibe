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
  const totalWeight = rubric.reduce((sum, criterion) => sum + safeWeight(criterion.weight), 0)
  const weightedScore = rubric.reduce((sum, criterion) => {
    const rating = clampRating(attempt.ratings[criterion.id])
    return sum + (rating / 5) * safeWeight(criterion.weight)
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
    .toSorted(
      (left, right) =>
        right.score - left.score ||
        compareText(left.title, right.title) ||
        compareText(left.id, right.id),
    )
}

export function updateCriterionWeight(
  rubric: RubricCriterion[],
  id: string,
  weight: number,
): RubricCriterion[] {
  const nextWeight = Number.isFinite(weight) ? Math.min(1, Math.max(0, weight)) : 0
  return rubric.map((criterion) =>
    criterion.id === id ? { ...criterion, weight: nextWeight } : criterion,
  )
}

export function normalizeRubricWeights(rubric: RubricCriterion[]): RubricCriterion[] {
  if (rubric.length === 0) return []

  const total = rubric.reduce((sum, criterion) => sum + safeWeight(criterion.weight), 0)
  const rawPoints = rubric.map((criterion) =>
    total === 0 ? 100 / rubric.length : (safeWeight(criterion.weight) / total) * 100,
  )
  const points = rawPoints.map(Math.floor)
  const remaining = 100 - points.reduce((sum, value) => sum + value, 0)
  const remainderOrder = rawPoints
    .map((value, index) => ({ index, fraction: value - points[index] }))
    .toSorted((left, right) => right.fraction - left.fraction || left.index - right.index)

  for (let index = 0; index < remaining; index += 1) {
    points[remainderOrder[index].index] += 1
  }

  return rubric.map((criterion, index) => ({ ...criterion, weight: points[index] / 100 }))
}

function safeWeight(weight: number) {
  return Number.isFinite(weight) && weight > 0 ? weight : 0
}

function clampRating(rating: number | undefined) {
  return Number.isFinite(rating) ? Math.min(5, Math.max(0, rating ?? 0)) : 0
}

function compareText(left: string, right: string) {
  if (left === right) return 0
  return left < right ? -1 : 1
}
