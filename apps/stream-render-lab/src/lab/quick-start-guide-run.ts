import { VirtualClock } from '../engine/clock'
import { createStreamingRenderEngine } from '../engine/create-engine'
import { createStore } from '../engine/store'
import type { ReadonlyStore, RenderSnapshot } from '../engine/types'
import { createQuickStartStreamChunks } from './quick-start-guide-fixture'
import {
  countVisibleTextUpdates,
  createGuidePipeline,
  type QuickStartGuideSnapshot,
  type QuickStartGuideStage,
} from './quick-start-guide-model'
import { createGuideProtocolSource } from './quick-start-guide-source'

export type {
  QuickStartGuidePipeline,
  QuickStartGuideSnapshot,
  QuickStartGuideStage,
} from './quick-start-guide-model'

export interface QuickStartGuideRun {
  state: ReadonlyStore<QuickStartGuideSnapshot>
  readNextChunk(): Promise<void>
  advanceAnimationFrame(): Promise<void>
  finish(): Promise<void>
  dispose(): void
}

export function createQuickStartGuideRun(): QuickStartGuideRun {
  const clock = new VirtualClock()
  const chunks = createQuickStartStreamChunks()
  const streamDurationMs = chunks.reduce((total, chunk) => total + chunk.delayMs, 0)
  const timelineDurationMs = Math.max(
    clock.frameDuration,
    Math.ceil(streamDurationMs / clock.frameDuration) * clock.frameDuration,
  )
  const progress = {
    streamChunksRead: 0,
    totalStreamChunks: chunks.length,
    sseEvents: 0,
    contentDeltas: 0,
  }
  let providerText = ''
  const streamChunkTimes: number[] = []
  const observed = createGuideProtocolSource({
    onStreamChunk: () => {
      progress.streamChunksRead += 1
      streamChunkTimes.push(clock.now())
    },
    onSseEvent: () => {
      progress.sseEvents += 1
    },
    onSourceEvent: (event) => {
      const streamEvent = event.event
      if (streamEvent.type !== 'part.delta' || streamEvent.delta.kind !== 'text') return
      progress.contentDeltas += 1
      providerText += streamEvent.delta.text
    },
  })
  const mirrored = createGuideProtocolSource()
  const M0 = createStreamingRenderEngine({ clock }).start({
    source: observed.source,
    profile: 'M0',
    reveal: 'direct',
    trace: 'off',
  })
  const M4 = createStreamingRenderEngine({ clock }).start({
    source: mirrored.source,
    profile: 'M4',
    reveal: 'direct',
    trace: 'off',
  })
  const visibleUpdates = {
    M0: countVisibleTextUpdates(M0.state, () => clock.now()),
    M4: countVisibleTextUpdates(M4.state, () => clock.now()),
  }
  let chunkIndex = 0
  let disposed = false
  let stage: QuickStartGuideStage = 'ready'
  const store = createStore(snapshot())

  function snapshot(): QuickStartGuideSnapshot {
    return {
      stage,
      elapsedMs: clock.now(),
      timelineDurationMs,
      streamChunkTimes: streamChunkTimes.slice(),
      progress: { ...progress },
      pipelines: {
        M0: createGuidePipeline(M0.inspect().snapshot, visibleUpdates.M0.times()),
        M4: createGuidePipeline(M4.inspect().snapshot, visibleUpdates.M4.times()),
      },
    }
  }

  async function readNextChunk(): Promise<void> {
    if (disposed) return
    const chunk = chunks[chunkIndex]
    if (!chunk) return
    chunkIndex += 1
    clock.advanceBy(chunk.delayMs)
    const isTerminalChunk = chunkIndex === chunks.length
    if (isTerminalChunk) {
      observed.enqueue(chunk.bytes)
      mirrored.enqueue(chunk.bytes)
      observed.close()
      mirrored.close()
      const reachedTerminal = await waitForTerminal(
        () => M0.inspect(),
        () => M4.inspect(),
        () => disposed,
      )
      if (!reachedTerminal) return
    } else {
      await Promise.all([observed.push(chunk.bytes), mirrored.push(chunk.bytes)])
    }
    const accepted = await waitForEngineAcceptance(
      () => M0.inspect(),
      () => M4.inspect(),
      providerText,
      () => disposed,
    )
    if (!accepted) return
    stage = getStage(M4.inspect().snapshot, progress.sseEvents)
    store.publish(snapshot())
  }

  async function advanceAnimationFrame(): Promise<void> {
    if (disposed) return
    clock.advanceFrame()
    await Promise.resolve()
    stage = 'visible-updated'
    store.publish(snapshot())
  }

  async function finish(): Promise<void> {
    if (disposed) return
    while (chunkIndex < chunks.length) {
      if (disposed) return
      // oxlint-disable-next-line no-await-in-loop -- the guide preserves stream read order
      await readNextChunk()
    }
    if (disposed) return
    if (M4.inspect().snapshot.phase !== 'settled') clock.advanceFrame()
    await Promise.all([M0.settled, M4.settled])
    if (disposed) return
    stage = 'settled'
    store.publish(snapshot())
  }

  function dispose(): void {
    if (disposed) return
    disposed = true
    observed.close()
    mirrored.close()
    M0.cancel('superseded')
    M4.cancel('superseded')
  }

  return { state: store, readNextChunk, advanceAnimationFrame, finish, dispose }
}

function getStage(snapshot: RenderSnapshot, sseEvents: number): QuickStartGuideStage {
  if (sseEvents === 0) return 'reading-network'
  return snapshot.metrics.backlogCodeUnits > 0 ? 'visible-update-pending' : 'visible-updated'
}

async function waitForEngineAcceptance(
  inspectBaseline: () => { snapshot: RenderSnapshot },
  inspectChallenger: () => { snapshot: RenderSnapshot },
  expected: string,
  stopped: () => boolean,
): Promise<boolean> {
  for (let turn = 0; turn < 1_000; turn += 1) {
    if (stopped()) return false
    const baselineText = createGuidePipeline(inspectBaseline().snapshot).acceptedText
    const challengerText = createGuidePipeline(inspectChallenger().snapshot).acceptedText
    if (baselineText === expected && challengerText === expected) return true
    // oxlint-disable-next-line no-await-in-loop -- drains ordered async generator turns
    await Promise.resolve()
  }
  throw new Error('Guide engines did not accept the provider content delta')
}

async function waitForTerminal(
  inspectBaseline: () => { snapshot: RenderSnapshot },
  inspectChallenger: () => { snapshot: RenderSnapshot },
  stopped: () => boolean,
): Promise<boolean> {
  for (let turn = 0; turn < 1_000; turn += 1) {
    if (stopped()) return false
    const baseline = inspectBaseline().snapshot
    const challenger = inspectChallenger().snapshot
    if (baseline.outcome && challenger.outcome) return true
    // oxlint-disable-next-line no-await-in-loop -- drains terminal protocol events in order
    await Promise.resolve()
  }
  throw new Error('Guide engines did not receive the terminal SSE event')
}
