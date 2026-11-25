import type { RenderSnapshot } from '../engine/types'

export interface QuickStartGuideActions {
  advanceAnimationFrame(): Promise<void>
  finish(): Promise<void>
  readNextChunk(): Promise<void>
  reset(): void
}

export interface QuickStartGuideViewSnapshot {
  stage: 'ready' | 'reading-network' | 'visible-update-pending' | 'visible-updated' | 'settled'
  elapsedMs?: number
  timelineDurationMs?: number
  streamChunkTimes?: readonly number[]
  progress: {
    streamChunksRead: number
    totalStreamChunks: number
    sseEvents: number
    contentDeltas: number
  }
  pipelines: Record<
    'M0' | 'M4',
    {
      acceptedText: string
      renderSnapshot?: RenderSnapshot
      visibleText: string
      visibleUpdates: number
      visibleUpdateTimes?: readonly number[]
    }
  >
}

export interface QuickStartGuidePanelProps {
  actions: QuickStartGuideActions
  busy?: boolean
  snapshot: QuickStartGuideViewSnapshot
}
