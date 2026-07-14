import rawSuite from './eval-suite.json'
import { collectEvalSuiteErrors, isEvalSuite } from './lib/eval-validation'

if (!isEvalSuite(rawSuite)) {
  throw new Error(`Bundled eval suite is invalid: ${collectEvalSuiteErrors(rawSuite).join(' ')}`)
}

export const defaultSuite = rawSuite
