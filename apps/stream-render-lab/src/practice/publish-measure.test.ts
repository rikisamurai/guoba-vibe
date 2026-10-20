import { describe, expect, it } from 'vitest'

import { implementations } from './implementations'
import {
  type CreatePublisher,
  immediatePublisher,
  measurePublish,
  publishScenarios,
} from './publish-measure'

const [burst, slow] = publishScenarios
const reference: CreatePublisher = (show, clock) =>
  implementations.reference.createPublisher(show, clock)
const dropsTail: CreatePublisher = (show, clock) => {
  let latest = ''
  let frame: number | undefined
  return {
    push(text) {
      latest = text
      frame ??= clock.request(() => {
        frame = undefined
        show(latest)
      })
    },
    finish() {
      if (frame !== undefined) clock.cancel(frame)
    },
    cancel() {},
  }
}

describe('publish.ts measurement on virtual frames', () => {
  it('immediate publication shows every input without waiting', () => {
    const result = measurePublish(immediatePublisher, burst)
    expect(result.publishes).toBe(result.pushes)
    expect(result).toMatchObject({ averageWaitMs: 0, maxWaitMs: 0, finalMatches: true })
  })
  it('frame batching cuts burst publications but adds at most one frame of wait', () => {
    const result = measurePublish(reference, burst)
    expect(result.publishes).toBeLessThan(result.pushes / 4)
    expect(result.maxWaitMs).toBeLessThanOrEqual(16.7)
    expect(result.finalMatches).toBe(true)
  })
  it('slow arrival keeps the publish count and only adds wait', () => {
    const result = measurePublish(reference, slow)
    expect(result.publishes).toBe(result.pushes)
    expect(result.averageWaitMs).toBeGreaterThan(0)
  })
  it('reports a publisher that drops the tail on finish', () => {
    expect(measurePublish(dropsTail, burst).finalMatches).toBe(false)
  })
})
