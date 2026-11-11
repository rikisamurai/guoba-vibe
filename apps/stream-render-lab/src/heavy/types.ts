import type { EngineClock } from '../engine/clock'

export type HeavyKind = 'code' | 'math' | 'mermaid'

export interface HeavyJobSpec {
  key: string
  runId: string
  blockId: string
  revision: number
  kind: HeavyKind
  source: string
  language?: string | null
  display?: boolean
}

export interface HighlightToken {
  content: string
  color?: string
}

export type HeavyOutput =
  | { kind: 'code'; tokens: readonly HighlightToken[] }
  | { kind: 'html'; html: string }

export type HeavyArtifact =
  | { job: HeavyJobSpec; status: 'complete'; output: HeavyOutput }
  | { job: HeavyJobSpec; status: 'failed'; error: string; lastGood?: HeavyOutput }

export interface HeavyMetrics {
  attempts: number
  completed: number
  failed: number
  pending: number
  shikiEnqueuedCodeUnits: number
  durationMs: number
}

export interface HeavyWorkCoordinator {
  reconcile(plan: readonly HeavyJobSpec[]): void
  finalize(plan: readonly HeavyJobSpec[], signal: AbortSignal): Promise<readonly HeavyArtifact[]>
  cancel(): void
  inspect(): HeavyMetrics
}

export interface HeavyCoordinatorContext {
  clock: EngineClock
  runId: string
  onArtifact(artifact: HeavyArtifact): void
}

export type HeavyCoordinatorFactory = (context: HeavyCoordinatorContext) => HeavyWorkCoordinator
