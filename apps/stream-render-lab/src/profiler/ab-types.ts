import type { RenderProfile, RenderSnapshot } from '../engine/types'

export type AbProfile = Extract<RenderProfile, 'M0' | 'M1'>

export interface AbProfileConfig {
  baseline: AbProfile
  challenger: AbProfile
  cadenceMs: number
  chunkSize: number
  fixture: 'mixed-markdown'
  repetitions: number
  sizeKb: number
  warmups: number
}

export type ProfileLayer =
  | 'network'
  | 'decode'
  | 'sse'
  | 'provider'
  | 'parse'
  | 'react'
  | 'heavy'
  | 'long-task'

export interface ProfileTimelineSample {
  durationMs: number
  label: string
  layer: ProfileLayer
  startMs: number
}

export interface ProfileRunSample {
  elapsedMs: number
  index: number
  longTasks: number
  longTasksSupported: boolean
  profile: AbProfile
  reactCommits: number
  reactDurationMs: number
  snapshot: RenderSnapshot
  timeline: readonly ProfileTimelineSample[]
}

export interface ProfileAggregate {
  commits: number
  cvPercent: number | null
  longTasks: number
  longTasksSupported: boolean
  parseWork: number
  profile: AbProfile
  rawToVisibleP95Ms: number
  reactDurationP95Ms: number
}

export interface AbProfileReport {
  baseline: ProfileAggregate
  challenger: ProfileAggregate
  runs: readonly ProfileRunSample[]
}

export const DEFAULT_AB_CONFIG: AbProfileConfig = {
  baseline: 'M0',
  challenger: 'M1',
  cadenceMs: 2,
  chunkSize: 96,
  fixture: 'mixed-markdown',
  repetitions: 5,
  sizeKb: 16,
  warmups: 1,
}
