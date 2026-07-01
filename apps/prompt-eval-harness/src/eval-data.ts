import rawSuite from './eval-suite.json'
import type { EvalSuite, EvalSuiteAttempt, RubricCriterion } from './lib/prompt-eval'

export type HarnessAttempt = EvalSuiteAttempt

export const suite = rawSuite as EvalSuite
export const initialRubric: RubricCriterion[] = suite.rubric
export const attempts: HarnessAttempt[] = suite.attempts
