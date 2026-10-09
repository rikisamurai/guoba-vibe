import { describe, expect, it } from 'vitest'

import type { ProfileTimelineSample } from './ab-types'
import { appendEngineTiming, createEngineTimingCursor } from './profile-observation'

describe('profile engine timing', () => {
  it('places only newly observed duration at the snapshot observation point', () => {
    const timeline: ProfileTimelineSample[] = []
    const cursor = createEngineTimingCursor()

    appendEngineTiming(timeline, cursor, {
      observedAtMs: 10,
      previewParseMs: 4,
      canonicalParseMs: 0,
      heavyMs: 0,
    })
    appendEngineTiming(timeline, cursor, {
      observedAtMs: 25,
      previewParseMs: 6,
      canonicalParseMs: 3,
      heavyMs: 5,
    })

    expect(timeline).toEqual([
      { layer: 'parse', label: 'preview parse', startMs: 6, durationMs: 4 },
      { layer: 'parse', label: 'preview parse', startMs: 23, durationMs: 2 },
      { layer: 'parse', label: 'canonical parse', startMs: 22, durationMs: 3 },
      { layer: 'heavy', label: 'heavy jobs', startMs: 20, durationMs: 5 },
    ])
  })
})
