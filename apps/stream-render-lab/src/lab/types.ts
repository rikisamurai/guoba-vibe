import type { LessonPresetId } from '@stream-render/contract'

import type { RenderProfile, RenderSnapshot, RevealMode, TraceLevel } from '../engine/types'
import type { SseEvent } from '../protocol/sse'
import type { SourceEvent } from '../protocol/types'

export type LabTransport = 'readable-stream' | 'async-iterable'
export type LabSliceMode = 'random' | 'boundary-aware'
export type LabPlaybackStatus = 'idle' | 'running' | 'paused' | 'settled'
export type LabInspectorTab = 'rendered' | 'wire' | 'events' | 'blocks' | 'metrics'

export interface LabConfig {
  presetId: LessonPresetId
  input: string
  baseline: RenderProfile
  challenger: RenderProfile
  transport: LabTransport
  sliceMode: LabSliceMode
  chunkMin: number
  chunkMax: number
  delayMin: number
  delayMax: number
  burstiness: number
  seed: number
  commitCadenceMs: number
  reveal: RevealMode
  trace: TraceLevel
}

export interface LabPreset {
  id: LessonPresetId
  label: string
  summary: string
  question: string
  config: LabConfig
}

export interface WireChunkRecord {
  index: number
  byteLength: number
  delayMs: number
  hex: string
  preview: string
}

export interface DecodedChunkRecord {
  index: number
  byteLength: number
  text: string
}

export interface LabTrace {
  wire: readonly WireChunkRecord[]
  decoded: readonly DecodedChunkRecord[]
  lines: readonly string[]
  sse: readonly SseEvent[]
  events: readonly SourceEvent[]
}

export interface LabState {
  status: LabPlaybackStatus
  progress: { current: number; total: number }
  snapshots: Partial<Record<RenderProfile, RenderSnapshot>>
  trace: LabTrace
}

export interface LabSettledReport {
  runId: string
  outcome: 'completed' | 'incomplete' | 'truncated' | 'cancelled' | 'failed'
  snapshots: Partial<Record<RenderProfile, RenderSnapshot>>
  trace: LabTrace
}

export const RENDER_PROFILES = ['M0', 'M1', 'M2', 'M3', 'M4'] as const
