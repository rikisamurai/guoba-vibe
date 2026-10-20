import { describe, expect, it } from 'vitest'

import { RunModel } from './run-model'

describe('RunModel projection work', () => {
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
