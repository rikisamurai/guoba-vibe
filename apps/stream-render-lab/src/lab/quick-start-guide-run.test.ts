import { describe, expect, it } from 'vitest'

import { normalizeRenderIr } from '../markdown'
import { createQuickStartGuideRun, type QuickStartGuidePipeline } from './quick-start-guide-run'

describe('Quick Start guided run', () => {
  it('does not accept model text before the network reads contain a complete SSE event', async () => {
    const run = createQuickStartGuideRun()

    await run.readNextChunk()
    await run.readNextChunk()
    const snapshot = run.state.getSnapshot()

    expect(snapshot.progress).toMatchObject({ streamChunksRead: 2, sseEvents: 0 })
    expect(snapshot.pipelines.M0.acceptedText).toBe('')
    expect(snapshot.pipelines.M4.acceptedText).toBe('')
  })

  it('keeps accepted text ahead of visible text until M4 receives an animation frame', async () => {
    const run = createQuickStartGuideRun()

    await run.readNextChunk()
    await run.readNextChunk()
    await run.readNextChunk()
    const snapshot = run.state.getSnapshot()

    expect(snapshot.progress).toMatchObject({ sseEvents: 1, contentDeltas: 1 })
    expect(snapshot.pipelines.M4.acceptedText).toBe('# Streaming\n\n')
    expect(snapshot.pipelines.M4.visibleText).toBe('')
    expect(snapshot.stage).toBe('visible-update-pending')
    expect(snapshot.elapsedMs).toBeLessThan(16)
    expect(snapshot.streamChunkTimes).toEqual([2, 5, 9])
  })

  it('publishes the pending visible text on a frame without reading another stream chunk', async () => {
    const run = createQuickStartGuideRun()
    await run.readNextChunk()
    await run.readNextChunk()
    await run.readNextChunk()
    const beforeFrame = run.state.getSnapshot()

    await run.advanceAnimationFrame()
    const snapshot = run.state.getSnapshot()

    expect(snapshot.progress.streamChunksRead).toBe(beforeFrame.progress.streamChunksRead)
    expect(snapshot.streamChunkTimes).toEqual(beforeFrame.streamChunkTimes)
    expect(snapshot.elapsedMs).toBe(16)
    expect(snapshot.pipelines.M4.visibleText).toBe(snapshot.pipelines.M4.acceptedText)
    expect(snapshot.pipelines.M4.visibleUpdates).toBe(1)
    expect(snapshot.pipelines.M4.visibleUpdateTimes).toEqual([16])
    expect(snapshot.stage).toBe('visible-updated')
  })

  it('settles both profiles with equal output while M4 uses fewer visible updates', async () => {
    const run = createQuickStartGuideRun()

    await run.finish()
    const snapshot = run.state.getSnapshot()
    const baseline = snapshot.pipelines.M0
    const challenger = snapshot.pipelines.M4
    const expected = '# Streaming\n\n浏览器先读到字节，界面稍后更新。'

    expect(snapshot.stage).toBe('settled')
    expect(snapshot.timelineDurationMs).toBe(32)
    expect(snapshot.progress.streamChunksRead).toBe(snapshot.progress.totalStreamChunks)
    expect(snapshot.streamChunkTimes).toEqual([2, 5, 9, 13, 17, 22])
    expect(baseline.acceptedText).toBe(expected)
    expect(challenger.acceptedText).toBe(expected)
    expect(baseline.visibleText).toBe(expected)
    expect(challenger.visibleText).toBe(expected)
    expect(normalizedDocument(challenger)).toEqual(normalizedDocument(baseline))
    expect(baseline.visibleUpdateTimes).toEqual([9, 13, 17])
    expect(challenger.visibleUpdateTimes).toEqual([16, 32])
    expect(baseline.visibleUpdates).toBe(baseline.visibleUpdateTimes.length)
    expect(challenger.visibleUpdates).toBe(challenger.visibleUpdateTimes.length)
    expect(challenger.visibleUpdates).toBeLessThan(baseline.visibleUpdates)
  })

  it('stops reading and publishing guide state after disposal', async () => {
    const run = createQuickStartGuideRun()
    await run.readNextChunk()
    const before = run.state.getSnapshot()
    let publications = 0
    run.state.subscribe(() => {
      publications += 1
    })

    run.dispose()
    await run.readNextChunk()
    await run.advanceAnimationFrame()
    await run.finish()

    expect(run.state.getSnapshot()).toBe(before)
    expect(publications).toBe(0)
  })

  it('settles an in-flight finish without publishing after disposal', async () => {
    const run = createQuickStartGuideRun()
    const before = run.state.getSnapshot()
    let publications = 0
    run.state.subscribe(() => {
      publications += 1
    })

    const settling = run.finish()
    run.dispose()
    await settling

    expect(run.state.getSnapshot()).toBe(before)
    expect(publications).toBe(0)
  })
})

function normalizedDocument(pipeline: QuickStartGuidePipeline) {
  const document = pipeline.renderSnapshot.parts.find((part) => part.kind === 'answer')?.document
  return document ? normalizeRenderIr(document) : null
}
