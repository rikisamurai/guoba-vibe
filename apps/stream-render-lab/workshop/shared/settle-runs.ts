import { VirtualClock } from '../../src/engine/clock'
import type { RenderRun, RunResult } from '../../src/engine/types'

export async function settleRuns(
  clock: VirtualClock,
  runs: readonly RenderRun[],
): Promise<RunResult[]> {
  await waitForClockWork(clock)
  clock.runUntilIdle()
  await waitForDrain(runs)
  clock.runUntilIdle()
  return Promise.all(runs.map((run) => run.settled))
}

async function waitForClockWork(clock: VirtualClock): Promise<void> {
  for (let turn = 0; turn < 10 && clock.pendingCount === 0; turn += 1) {
    // oxlint-disable-next-line no-await-in-loop -- sources register clock work in microtasks
    await Promise.resolve()
  }
}

async function waitForDrain(runs: readonly RenderRun[]): Promise<void> {
  for (let turn = 0; turn < 100; turn += 1) {
    if (runs.every((run) => ['draining', 'settled'].includes(run.state.getSnapshot().phase))) return
    // oxlint-disable-next-line no-await-in-loop -- engine phases advance in ordered microtasks
    await Promise.resolve()
  }
}
