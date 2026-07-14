import type { EvalSuite } from './prompt-eval'

export type EvalValidation = { ok: true; errors: [] } | { ok: false; errors: string[] }
export type ParsedEvalSuite =
  | { ok: true; errors: []; suite: EvalSuite }
  | { ok: false; errors: string[] }

export function validateEvalSuite(value: unknown): EvalValidation {
  const errors = collectEvalSuiteErrors(value)
  return errors.length === 0 ? { ok: true, errors: [] } : { ok: false, errors }
}

export function isEvalSuite(value: unknown): value is EvalSuite {
  return collectEvalSuiteErrors(value).length === 0
}

export function parseEvalSuite(payload: string): ParsedEvalSuite {
  try {
    const parsed: unknown = JSON.parse(payload)
    const errors = collectEvalSuiteErrors(parsed)
    return errors.length === 0 && isEvalSuite(parsed)
      ? { ok: true, errors: [], suite: parsed }
      : { ok: false, errors }
  } catch {
    return { ok: false, errors: ['Suite must be valid JSON.'] }
  }
}

export function collectEvalSuiteErrors(value: unknown): string[] {
  if (!isRecord(value)) return ['Suite must be a JSON object.']

  const errors: string[] = []
  requireText(value.id, 'Suite id', errors)
  requireText(value.title, 'Suite title', errors)
  requireText(value.description, 'Suite description', errors)
  validateTask(value.task, errors)
  const criteria = validateRubric(value.rubric, errors)
  validateAttempts(value.attempts, criteria, errors)
  return errors
}

function validateTask(value: unknown, errors: string[]) {
  if (!isRecord(value)) {
    errors.push('Suite task must be an object.')
    return
  }

  requireText(value.prompt, 'Task prompt', errors)
  if (!Array.isArray(value.expectedOutcome) || value.expectedOutcome.length === 0) {
    errors.push('Task must include at least one expected outcome.')
  } else if (value.expectedOutcome.some((item) => !isNonEmptyText(item))) {
    errors.push('Every expected outcome must be non-empty text.')
  }
}

function validateRubric(value: unknown, errors: string[]) {
  if (!Array.isArray(value) || value.length === 0) {
    errors.push('Suite must include at least one rubric criterion.')
    return []
  }

  const criteria = value.filter(isRecord)
  if (criteria.length !== value.length) errors.push('Every rubric criterion must be an object.')

  const ids: string[] = []
  let total = 0
  criteria.forEach((criterion, index) => {
    const prefix = `Rubric criterion ${index + 1}`
    if (isNonEmptyText(criterion.id)) ids.push(criterion.id)
    else errors.push(`${prefix} needs a non-empty id.`)
    requireText(criterion.label, `${prefix} label`, errors)
    if (criterion.description !== undefined) {
      requireText(criterion.description, `${prefix} description`, errors)
    }
    if (!isBoundedNumber(criterion.weight, 0, 1)) {
      errors.push(`${prefix} weight must be a finite number from 0 to 1.`)
    } else {
      total += criterion.weight
    }
  })

  if (new Set(ids).size !== ids.length) errors.push('Rubric criterion ids must be unique.')
  if (Math.abs(total - 1) > 0.000_001) {
    errors.push(`Rubric weights must total 100% (currently ${Math.round(total * 100)}%).`)
  }
  return criteria
}

function validateAttempts(value: unknown, criteria: Record<string, unknown>[], errors: string[]) {
  if (!Array.isArray(value) || value.length === 0) {
    errors.push('Suite must include at least one attempt.')
    return
  }

  const attempts = value.filter(isRecord)
  if (attempts.length !== value.length) errors.push('Every attempt must be an object.')
  const attemptIds: string[] = []

  attempts.forEach((attempt, index) => {
    const title = isNonEmptyText(attempt.title) ? attempt.title : `Attempt ${index + 1}`
    if (isNonEmptyText(attempt.id)) attemptIds.push(attempt.id)
    else errors.push(`${title} needs a non-empty id.`)
    requireText(attempt.title, `${title} title`, errors)
    requireText(attempt.brief, `${title} brief`, errors)
    requireText(attempt.output, `${title} output`, errors)
    validateAttemptRecords(attempt, title, criteria, errors)
  })

  if (new Set(attemptIds).size !== attemptIds.length) errors.push('Attempt ids must be unique.')
}

function validateAttemptRecords(
  attempt: Record<string, unknown>,
  title: string,
  criteria: Record<string, unknown>[],
  errors: string[],
) {
  if (!isRecord(attempt.ratings) || !isRecord(attempt.evidence)) {
    errors.push(`${title} must include ratings and evidence objects.`)
    return
  }

  const criterionIds = criteria.map((item) => item.id).filter(isNonEmptyText)
  for (const id of criterionIds) {
    const label = criteria.find((item) => item.id === id)?.label
    const name = isNonEmptyText(label) ? label : id
    if (!isBoundedNumber(attempt.ratings[id], 1, 5)) {
      errors.push(`${title} rating for ${name} must be a finite number from 1 to 5.`)
    }
    if (!isNonEmptyText(attempt.evidence[id])) {
      errors.push(`${title} is missing evidence for ${name}.`)
    }
  }

  const unknownRatings = Object.keys(attempt.ratings).filter((id) => !criterionIds.includes(id))
  const unknownEvidence = Object.keys(attempt.evidence).filter((id) => !criterionIds.includes(id))
  if (unknownRatings.length)
    errors.push(`${title} has ratings for unknown criteria: ${unknownRatings.join(', ')}.`)
  if (unknownEvidence.length) {
    errors.push(`${title} has evidence for unknown criteria: ${unknownEvidence.join(', ')}.`)
  }
}

function requireText(value: unknown, label: string, errors: string[]) {
  if (!isNonEmptyText(value)) errors.push(`${label} must be non-empty text.`)
}

function isNonEmptyText(value: unknown): value is string {
  return typeof value === 'string' && Boolean(value.trim())
}

function isBoundedNumber(value: unknown, min: number, max: number): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= min && value <= max
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value))
}
