import { it } from 'vitest'

import { assertQuickStartContract } from '../contract'
import { runComparison } from './run-comparison'

it('compares M0 and M4 with one deterministic trace', () => assertQuickStartContract(runComparison))
