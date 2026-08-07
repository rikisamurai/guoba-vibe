import { expect, it } from 'vitest'

import { normalizeRenderIr } from '../../../src/markdown'
import { QUICK_START_RAW } from './fixture'
import type { QuickStartRun } from './run-profile'

export interface QuickStartComparison {
  baseline: QuickStartRun
  challenger: QuickStartRun
}

export interface QuickStartApi {
  runComparison(): Promise<QuickStartComparison>
}

export function defineQuickStartContract(api: QuickStartApi): void {
  const comparison = api.runComparison()

  it('00 settles both views with the complete replay', async () => {
    const { baseline, challenger } = await comparison
    expect(baseline.result.outcome.kind).toBe('completed')
    expect(challenger.result.outcome.kind).toBe('completed')
  })

  it('00 keeps final raw and render IR equivalent', async () => {
    const { baseline, challenger } = await comparison
    const baselinePart = baseline.result.snapshot.parts[0]
    const challengerPart = challenger.result.snapshot.parts[0]

    expect([baselinePart?.raw, challengerPart?.raw]).toEqual([QUICK_START_RAW, QUICK_START_RAW])
    expect(normalizeRenderIr(challengerPart.document)).toEqual(
      normalizeRenderIr(baselinePart.document),
    )
  })

  it('00 compares M0 with M4 and publishes fewer commits', async () => {
    const { baseline, challenger } = await comparison
    expect(baseline.profile).toBe('M0')
    expect(challenger.profile).toBe('M4')
    expect(challenger.result.snapshot.metrics.commits).toBeLessThan(
      baseline.result.snapshot.metrics.commits,
    )
  })
}
