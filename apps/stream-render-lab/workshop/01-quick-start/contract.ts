import { expect } from 'vitest'

import type { RunResult } from '../../src/engine/types'

export interface QuickStartResult {
  m0: RunResult
  m4: RunResult
}

export type QuickStartImplementation = () => Promise<QuickStartResult>

export async function assertQuickStartContract(run: QuickStartImplementation): Promise<void> {
  const result = await run()
  const m0Part = result.m0.snapshot.parts.find((part) => part.kind === 'answer')
  const m4Part = result.m4.snapshot.parts.find((part) => part.kind === 'answer')

  expect(result.m0.outcome.kind).toBe('completed')
  expect(result.m4.outcome.kind).toBe('completed')
  expect(m4Part?.raw).toBe(m0Part?.raw)
  expect(m4Part?.document).toEqual(m0Part?.document)
  expect(result.m4.snapshot.metrics.commits).toBeLessThan(result.m0.snapshot.metrics.commits)
}
