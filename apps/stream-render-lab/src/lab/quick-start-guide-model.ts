import type { ReadonlyStore, RenderSnapshot } from '../engine/types'

export type QuickStartGuideStage =
  | 'ready'
  | 'reading-network'
  | 'visible-update-pending'
  | 'visible-updated'
  | 'settled'

export interface QuickStartGuidePipeline {
  acceptedText: string
  visibleText: string
  visibleUpdates: number
  visibleUpdateTimes: readonly number[]
  renderSnapshot: RenderSnapshot
}

export interface QuickStartGuideSnapshot {
  stage: QuickStartGuideStage
  elapsedMs: number
  timelineDurationMs: number
  streamChunkTimes: readonly number[]
  progress: {
    streamChunksRead: number
    totalStreamChunks: number
    sseEvents: number
    contentDeltas: number
  }
  pipelines: Record<'M0' | 'M4', QuickStartGuidePipeline>
}

export interface VisibleUpdateCounter {
  times(): readonly number[]
}

export function createGuidePipeline(
  snapshot: RenderSnapshot,
  visibleUpdateTimes: readonly number[] = [],
): QuickStartGuidePipeline {
  const parts = snapshot.parts.filter((part) => part.kind === 'answer')
  return {
    acceptedText: parts.map((part) => part.raw).join(''),
    visibleText: parts.map((part) => part.visible).join(''),
    visibleUpdates: visibleUpdateTimes.length,
    visibleUpdateTimes: visibleUpdateTimes.slice(),
    renderSnapshot: snapshot,
  }
}

export function countVisibleTextUpdates(
  store: ReadonlyStore<RenderSnapshot>,
  now: () => number,
): VisibleUpdateCounter {
  let previous = visibleText(store.getSnapshot())
  const times: number[] = []
  store.subscribe(() => {
    const next = visibleText(store.getSnapshot())
    if (next === previous) return
    previous = next
    times.push(now())
  })
  return { times: () => times.slice() }
}

function visibleText(snapshot: RenderSnapshot): string {
  return snapshot.parts
    .filter((part) => part.kind === 'answer')
    .map((part) => part.visible)
    .join('')
}
