import type { EvalAttempt, RubricCriterion } from './lib/prompt-eval'

export type HarnessAttempt = EvalAttempt & {
  brief: string
  output: string
  evidence: Record<string, string>
}

export const initialRubric: RubricCriterion[] = [
  { id: 'correctness', label: 'Correctness', weight: 0.5 },
  { id: 'verification', label: 'Verification', weight: 0.3 },
  { id: 'scope', label: 'Scope control', weight: 0.2 },
]

export const attempts: HarnessAttempt[] = [
  {
    id: 'agent-a',
    title: 'Agent A',
    brief: 'Fixes the parser and updates the failing test first.',
    output: 'Small domain patch, one focused test, build evidence included.',
    ratings: { correctness: 5, verification: 4, scope: 3 },
    evidence: {
      correctness: 'Handles the failing payload and keeps the old path stable.',
      verification: 'Runs unit test and build, but skips browser smoke.',
      scope: 'Touches one helper outside the reported bug path.',
    },
  },
  {
    id: 'agent-b',
    title: 'Agent B',
    brief: 'Ships the feature with explicit regression coverage.',
    output: 'Adds a narrow helper, cites screenshots, and keeps transport code thin.',
    ratings: { correctness: 4, verification: 5, scope: 5 },
    evidence: {
      correctness: 'Meets the contract, with one naming choice to recheck.',
      verification: 'Unit, build, lint, and browser evidence are all present.',
      scope: 'No unrelated file churn in the diff.',
    },
  },
  {
    id: 'agent-c',
    title: 'Agent C',
    brief: 'Refactors the view before fixing the behavior.',
    output: 'Readable result, but verification and diff size are weak.',
    ratings: { correctness: 3, verification: 3, scope: 4 },
    evidence: {
      correctness: 'Core behavior works for the sample but not edge payloads.',
      verification: 'Only local unit tests were run.',
      scope: 'Mostly contained, but the visual rewrite is not required.',
    },
  },
]
