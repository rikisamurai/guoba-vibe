import { createBrowserHeavyCoordinator } from '../heavy/coordinator'
import type { HeavyCoordinatorFactory } from '../heavy/types'
import { BrowserClock, type EngineClock } from './clock'
import { createRenderRun } from './render-run'
import type { StartRenderInput, StreamingRenderEngine } from './types'

interface EngineOptions {
  clock?: EngineClock
  createHeavyCoordinator?: HeavyCoordinatorFactory
}

const PROFILES = new Set(['M0', 'M1', 'M2', 'M3', 'M4', 'production'])

function validateInput(input: StartRenderInput): void {
  if (!PROFILES.has(input.profile)) throw new TypeError('Invalid render profile')
  if (input.reveal !== 'direct' && input.reveal !== 'smooth') {
    throw new TypeError('Invalid reveal mode')
  }
  if (input.trace !== 'off' && input.trace !== 'summary' && input.trace !== 'full') {
    throw new TypeError('Invalid trace level')
  }
  if (!input.source || typeof input.source.open !== 'function') {
    throw new TypeError('Invalid stream source')
  }
}

export function createStreamingRenderEngine(options: EngineOptions = {}): StreamingRenderEngine {
  const clock = options.clock ?? new BrowserClock()
  const createHeavyCoordinator = options.createHeavyCoordinator ?? createBrowserHeavyCoordinator
  let runSequence = 0
  return {
    start(input) {
      validateInput(input)
      runSequence += 1
      return createRenderRun(`run-${runSequence}`, clock, input, createHeavyCoordinator)
    },
  }
}
