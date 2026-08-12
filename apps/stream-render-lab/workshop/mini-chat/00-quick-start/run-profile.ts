import {
  createStreamingRenderEngine,
  type RenderProfile,
  type RunResult,
  VirtualClock,
} from '../../../src/engine'
import { ReplaySource } from '../../../src/replay'
import { QUICK_START_TRACE } from './fixture'

export interface QuickStartRun {
  profile: RenderProfile
  result: RunResult
}

export async function runProfile(profile: RenderProfile): Promise<QuickStartRun> {
  const clock = new VirtualClock({ frameDuration: 16 })
  const run = createStreamingRenderEngine({ clock }).start({
    source: new ReplaySource(clock, QUICK_START_TRACE),
    profile,
    reveal: 'direct',
    trace: 'off',
  })

  for (const at of new Set(QUICK_START_TRACE.map((record) => record.at))) {
    clock.advanceBy(at - clock.now())
    // Let every record at this arrival time cross ReplaySource before advancing virtual time.
    // oxlint-disable-next-line no-await-in-loop -- replay delivery is intentionally ordered
    await flushPromiseTurns(QUICK_START_TRACE.length * 2)
  }

  let settled = false
  for (let turn = 0; turn < 100; turn += 1) {
    clock.runUntilIdle()
    // oxlint-disable-next-line no-await-in-loop -- one promise turn lets Replay feed the engine
    await Promise.resolve()
    if (run.state.getSnapshot().phase === 'settled') {
      settled = true
      break
    }
  }

  if (!settled) throw new Error(`${profile} did not settle after VirtualClock became idle`)
  return { profile, result: await run.settled }
}

async function flushPromiseTurns(count: number): Promise<void> {
  for (let turn = 0; turn < count; turn += 1) {
    // oxlint-disable-next-line no-await-in-loop -- each turn advances an async iterator once
    await Promise.resolve()
  }
}
