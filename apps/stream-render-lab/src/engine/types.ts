import type { HeavyArtifact, HeavyMetrics } from '../heavy/types'
import type { RenderDocument } from '../markdown/types'
import type { InternalEnvelope, PartKind, RunOutcome, SourceEvent } from '../protocol/types'

export type RenderProfile = 'M0' | 'M1' | 'M2' | 'M3' | 'M4' | 'production'
export type RevealMode = 'direct' | 'smooth'
export type TraceLevel = 'off' | 'summary' | 'full'
export type RunPhase = 'connecting' | 'streaming' | 'draining' | 'settling' | 'settled'

export interface StreamSource {
  open(signal: AbortSignal): AsyncIterable<SourceEvent>
}

export interface ReadonlyStore<T> {
  getSnapshot(): T
  subscribe(listener: () => void): () => void
}

export interface RenderPart {
  id: string
  kind: PartKind
  raw: string
  visible: string
  document: RenderDocument
  ended: boolean
}

export interface RunMetrics {
  internalEvents: number
  commits: number
  previewParsePasses: number
  previewParsedCodeUnits: number
  canonicalParsePasses: number
  previewParseDurationMs: number
  canonicalParseDurationMs: number
  fullFallbacks: number
  backlogCodeUnits: number
  rawToVisibleSamples: number
  rawToVisibleP50Ms: number
  rawToVisibleP95Ms: number
}

export interface RenderDiagnostic {
  code: string
  message: string
  offset?: number
}

export interface RenderSnapshot {
  runId: string
  revision: number
  phase: RunPhase
  outcome?: RunOutcome
  throughInternalSeq: number | null
  parts: readonly RenderPart[]
  metrics: RunMetrics
  diagnostics: readonly RenderDiagnostic[]
  heavyArtifacts: readonly HeavyArtifact[]
  heavyMetrics: HeavyMetrics
}

export interface RunResult {
  outcome: RunOutcome
  snapshot: RenderSnapshot
}

export interface InspectionSnapshot {
  snapshot: RenderSnapshot
  trace: readonly InternalEnvelope[]
}

export interface RenderRun {
  state: ReadonlyStore<RenderSnapshot>
  settled: Promise<RunResult>
  cancel(reason?: string): void
  inspect(): InspectionSnapshot
}

export interface StartRenderInput {
  source: StreamSource
  profile: RenderProfile
  reveal: RevealMode
  trace: TraceLevel
}

export interface StreamingRenderEngine {
  start(input: StartRenderInput): RenderRun
}
