export type RubricCriterion = {
  id: string
  label: string
  weight: number
}

export type EvalAttempt = {
  id: string
  title: string
  ratings: Record<string, number>
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
