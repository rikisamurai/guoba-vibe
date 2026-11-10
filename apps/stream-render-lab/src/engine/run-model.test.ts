import { describe, expect, it } from 'vitest'

import { RunModel } from './run-model'

describe('RunModel projection work', () => {
  it('reports exact nearest-rank percentiles as out-of-order delays arrive in batches', () => {
    const model = new RunModel('run-1', 'M2')
    model.startPart('answer', 'answer')
    const observed: number[] = []
    for (const delays of [
      [16, 3, 12, 7, 0],
      [3, 41, 6, 8, 15, 1, 0, 8, 3, 16, 5, 6, 2, 17, 32],
    ]) {
      for (const delay of delays) {
        model.appendPart('answer', { kind: 'text', text: 'x' }, 100 - delay)
      }
      model.commitPreview('direct', 100)
      observed.push(...delays)
      const sorted = observed.toSorted((a, b) => a - b)
      expect(model.snapshot('streaming').metrics).toMatchObject({
        rawToVisibleSamples: observed.length,
        rawToVisibleP50Ms: sorted[Math.ceil(observed.length * 0.5) - 1],
        rawToVisibleP95Ms: sorted[Math.ceil(observed.length * 0.95) - 1],
      })
    }
    model.commitCanonical(110)
    expect(model.snapshot('settled').metrics.rawToVisibleSamples).toBe(20)
  })

  it('does not reparse an ended part while a later part advances', () => {
    const model = new RunModel('run-1', 'M2')
    model.startPart('reasoning', 'reasoning')
    model.appendPart('reasoning', { kind: 'text', text: 'stable reasoning' }, 0)
    model.commitPreview('direct', 16)
    model.endPart('reasoning')
    model.startPart('answer', 'answer')
    const before = model.snapshot('streaming')
    const reasoningDocument = before.parts[0]?.document

    model.appendPart('answer', { kind: 'text', text: 'new answer' }, 20)
    model.commitPreview('direct', 32)
    const after = model.snapshot('streaming')

    expect(after.parts[0]?.document).toBe(reasoningDocument)
    expect(after.metrics.previewParsePasses - before.metrics.previewParsePasses).toBe(1)
    expect(after.metrics.previewParsedCodeUnits - before.metrics.previewParsedCodeUnits).toBe(
      after.parts[1]?.document.work.parsedCodeUnits,
    )
  })
})
