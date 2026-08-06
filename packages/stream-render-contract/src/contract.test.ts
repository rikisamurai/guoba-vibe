import { describe, expect, it } from 'vitest'

import { isDemoPresetPair, listLessonDemos } from './manifest'
import { isDemoReport } from './report'

describe('stream render lesson contract', () => {
  it('keeps every registered demo and preset discoverable', () => {
    const demos = listLessonDemos()

    expect(demos.map(({ demoId }) => demoId)).toEqual(['quick-start', 'sse', 'm1'])
    for (const demo of demos) {
      expect(demo.presets.length).toBeGreaterThan(0)
      expect(demo.presets.every((preset) => isDemoPresetPair(demo.demoId, preset))).toBe(true)
    }
  })

  it('accepts versioned ready and settled reports', () => {
    expect(isDemoReport({ version: 1, kind: 'ready', demoId: 'sse' })).toBe(true)
    expect(
      isDemoReport({
        version: 1,
        kind: 'run-settled',
        demoId: 'm1',
        runId: 'run-1',
        outcome: 'completed',
        checkpoints: [{ id: 'frame-cap', label: '每帧最多一次提交', passed: true }],
      }),
    ).toBe(true)
  })

  it('rejects unknown versions, demos and malformed checkpoints', () => {
    expect(isDemoReport({ version: 2, kind: 'ready', demoId: 'sse' })).toBe(false)
    expect(isDemoReport({ version: 1, kind: 'ready', demoId: 'unknown' })).toBe(false)
    expect(
      isDemoReport({
        version: 1,
        kind: 'run-settled',
        demoId: 'm1',
        runId: 'run-1',
        outcome: 'completed',
        checkpoints: [{ id: 'frame-cap', label: 'frame cap', passed: 'yes' }],
      }),
    ).toBe(false)
  })
})
